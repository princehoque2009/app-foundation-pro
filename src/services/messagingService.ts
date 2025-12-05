import { rtdb, firebaseStorage, generateChatId } from "@/lib/firebase";
import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  onChildAdded,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
  off,
  DatabaseReference,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  replyTo?: string;
  timestamp: number;
  seen: boolean;
  delivered: boolean;
}

export interface ChatListItem {
  chatId: string;
  friendId: string;
  lastMessage: string;
  lastMessageTime: number;
  unread: number;
}

export interface UserStatus {
  online: boolean;
  lastSeen: number;
}

// Create chat if not exists
export const createChatIfNotExists = async (
  userId: string,
  friendId: string
): Promise<string> => {
  const chatId = generateChatId(userId, friendId);
  
  const userChatRef = ref(rtdb, `userChats/${userId}/${chatId}`);
  const friendChatRef = ref(rtdb, `userChats/${friendId}/${chatId}`);
  
  const userChatSnapshot = await get(userChatRef);
  
  if (!userChatSnapshot.exists()) {
    await set(userChatRef, {
      friendId,
      lastMessage: "",
      lastMessageTime: Date.now(),
      unread: 0,
    });
    
    await set(friendChatRef, {
      friendId: userId,
      lastMessage: "",
      lastMessageTime: Date.now(),
      unread: 0,
    });
  }
  
  return chatId;
};

// Send text message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  text: string,
  replyTo?: string
): Promise<string> => {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  
  const message: Message = {
    senderId,
    receiverId,
    text,
    timestamp: Date.now(),
    seen: false,
    delivered: true,
    ...(replyTo && { replyTo }),
  };
  
  await set(newMessageRef, message);
  
  // Update chat list for both users
  await updateChatList(chatId, senderId, receiverId, text);
  
  return newMessageRef.key!;
};

// Send media message
export const sendMediaMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  file: File,
  mediaType: "image" | "video" | "audio" | "file",
  replyTo?: string
): Promise<string> => {
  // Upload file to Firebase Storage
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  const filePath = `messages/${chatId}/${timestamp}.${ext}`;
  const fileRef = storageRef(firebaseStorage, filePath);
  
  await uploadBytes(fileRef, file);
  const mediaUrl = await getDownloadURL(fileRef);
  
  // Create message
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  
  const message: Message = {
    senderId,
    receiverId,
    mediaUrl,
    mediaType,
    timestamp,
    seen: false,
    delivered: true,
    ...(replyTo && { replyTo }),
  };
  
  await set(newMessageRef, message);
  
  // Update chat list
  const mediaText = mediaType === "image" ? "📷 Photo" : 
                    mediaType === "video" ? "🎥 Video" :
                    mediaType === "audio" ? "🎵 Audio" : "📎 File";
  await updateChatList(chatId, senderId, receiverId, mediaText);
  
  return newMessageRef.key!;
};

// Update chat list for both users
const updateChatList = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  lastMessage: string
) => {
  const timestamp = Date.now();
  
  // Update sender's chat list
  await update(ref(rtdb, `userChats/${senderId}/${chatId}`), {
    lastMessage,
    lastMessageTime: timestamp,
  });
  
  // Update receiver's chat list and increment unread
  const receiverChatRef = ref(rtdb, `userChats/${receiverId}/${chatId}`);
  const receiverChatSnapshot = await get(receiverChatRef);
  const currentUnread = receiverChatSnapshot.val()?.unread || 0;
  
  await update(receiverChatRef, {
    lastMessage,
    lastMessageTime: timestamp,
    unread: currentUnread + 1,
  });
};

// Mark messages as seen
export const markAsSeen = async (
  chatId: string,
  userId: string,
  messageIds: string[]
): Promise<void> => {
  const updates: Record<string, any> = {};
  
  messageIds.forEach((msgId) => {
    updates[`chats/${chatId}/messages/${msgId}/seen`] = true;
  });
  
  // Reset unread count
  updates[`userChats/${userId}/${chatId}/unread`] = 0;
  
  await update(ref(rtdb), updates);
};

// Load messages with pagination
export const loadMessages = (
  chatId: string,
  limit: number = 50,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = query(
    ref(rtdb, `chats/${chatId}/messages`),
    orderByChild("timestamp"),
    limitToLast(limit)
  );
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    callback(messages);
  });
  
  return () => off(messagesRef);
};

// Load chat list
export const loadChatList = (
  userId: string,
  callback: (chats: ChatListItem[]) => void
): (() => void) => {
  const chatListRef = ref(rtdb, `userChats/${userId}`);
  
  const unsubscribe = onValue(chatListRef, (snapshot) => {
    const chats: ChatListItem[] = [];
    snapshot.forEach((child) => {
      chats.push({ chatId: child.key!, ...child.val() });
    });
    // Sort by last message time
    chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    callback(chats);
  });
  
  return () => off(chatListRef);
};

// Set typing status
export const setTyping = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  await set(ref(rtdb, `typing/${chatId}/${userId}`), isTyping);
};

// Listen to typing status
export const listenToTyping = (
  chatId: string,
  otherUserId: string,
  callback: (isTyping: boolean) => void
): (() => void) => {
  const typingRef = ref(rtdb, `typing/${chatId}/${otherUserId}`);
  
  const unsubscribe = onValue(typingRef, (snapshot) => {
    callback(snapshot.val() || false);
  });
  
  return () => off(typingRef);
};

// Set online status
export const setOnline = async (userId: string): Promise<void> => {
  await set(ref(rtdb, `status/${userId}`), {
    online: true,
    lastSeen: Date.now(),
  });
};

// Set offline status
export const setOffline = async (userId: string): Promise<void> => {
  await set(ref(rtdb, `status/${userId}`), {
    online: false,
    lastSeen: Date.now(),
  });
};

// Listen to user status
export const listenToUserStatus = (
  userId: string,
  callback: (status: UserStatus) => void
): (() => void) => {
  const statusRef = ref(rtdb, `status/${userId}`);
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    callback(snapshot.val() || { online: false, lastSeen: 0 });
  });
  
  return () => off(statusRef);
};
