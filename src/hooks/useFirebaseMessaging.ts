import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { generateChatId } from "@/lib/firebase";
import {
  Message,
  ChatListItem,
  UserStatus,
  createChatIfNotExists,
  sendMessage,
  sendMediaMessage,
  markAsSeen,
  loadMessages,
  loadChatList,
  setTyping,
  listenToTyping,
  setOnline,
  setOffline,
  listenToUserStatus,
} from "@/services/messagingService";

export const useFirebaseMessaging = (friendId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [friendStatus, setFriendStatus] = useState<UserStatus>({ online: false, lastSeen: 0 });
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize chat when friendId changes
  useEffect(() => {
    if (!user?.id || !friendId) {
      setChatId(null);
      return;
    }

    const initChat = async () => {
      const id = await createChatIfNotExists(user.id, friendId);
      setChatId(id);
    };

    initChat();
  }, [user?.id, friendId]);

  // Load messages for current chat
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsubscribe = loadMessages(chatId, 100, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  // Load chat list
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = loadChatList(user.id, setChatList);
    return unsubscribe;
  }, [user?.id]);

  // Listen to friend's typing status
  useEffect(() => {
    if (!chatId || !friendId) return;

    const unsubscribe = listenToTyping(chatId, friendId, setIsTyping);
    return unsubscribe;
  }, [chatId, friendId]);

  // Listen to friend's online status
  useEffect(() => {
    if (!friendId) return;

    const unsubscribe = listenToUserStatus(friendId, setFriendStatus);
    return unsubscribe;
  }, [friendId]);

  // Set user online/offline
  useEffect(() => {
    if (!user?.id) return;

    setOnline(user.id);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline(user.id);
      } else {
        setOnline(user.id);
      }
    };

    const handleBeforeUnload = () => {
      setOffline(user.id);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setOffline(user.id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.id]);

  // Send text message
  const send = useCallback(
    async (text: string, replyTo?: string) => {
      if (!user?.id || !friendId || !chatId) return;

      await sendMessage(chatId, user.id, friendId, text, replyTo);
      setTyping(chatId, user.id, false);
    },
    [user?.id, friendId, chatId]
  );

  // Send media message
  const sendMedia = useCallback(
    async (file: File, mediaType: "image" | "video" | "audio" | "file", replyTo?: string) => {
      if (!user?.id || !friendId || !chatId) return;

      await sendMediaMessage(chatId, user.id, friendId, file, mediaType, replyTo);
    },
    [user?.id, friendId, chatId]
  );

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!user?.id || !chatId) return;

    setTyping(chatId, user.id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chatId, user.id, false);
    }, 2000);
  }, [user?.id, chatId]);

  // Mark messages as seen
  const markSeen = useCallback(
    async (messageIds: string[]) => {
      if (!user?.id || !chatId) return;

      await markAsSeen(chatId, user.id, messageIds);
    },
    [user?.id, chatId]
  );

  return {
    messages,
    chatList,
    isTyping,
    friendStatus,
    loading,
    chatId,
    send,
    sendMedia,
    handleTyping,
    markSeen,
  };
};
