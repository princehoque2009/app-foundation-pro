import { rtdb } from "@/lib/firebase";
import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  off,
  remove,
} from "firebase/database";

export interface Call {
  id?: string;
  callerId: string;
  receiverId: string;
  type: "audio" | "video";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  status: "ringing" | "accepted" | "rejected" | "ended" | "busy";
  timestamp: number;
  duration?: number;
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

// ICE servers for WebRTC
export const iceServers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Start a call
export const startCall = async (
  callerId: string,
  receiverId: string,
  type: "audio" | "video",
  offer: RTCSessionDescriptionInit
): Promise<string> => {
  // Check if receiver is busy
  const receiverStatusRef = ref(rtdb, `status/${receiverId}`);
  const statusSnapshot = await get(receiverStatusRef);
  const status = statusSnapshot.val();
  
  if (status?.inCall) {
    throw new Error("User is busy");
  }
  
  const callsRef = ref(rtdb, "calls");
  const newCallRef = push(callsRef);
  
  const call: Call = {
    callerId,
    receiverId,
    type,
    offer,
    status: "ringing",
    timestamp: Date.now(),
  };
  
  await set(newCallRef, call);
  
  // Mark caller as in call
  await update(ref(rtdb, `status/${callerId}`), { 
    inCall: true,
    callId: newCallRef.key 
  });
  
  console.log("[CallingService] Call started with ID:", newCallRef.key);
  
  return newCallRef.key!;
};

// Accept a call
export const acceptCall = async (
  callId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> => {
  await update(ref(rtdb, `calls/${callId}`), {
    answer,
    status: "accepted",
  });
  
  // Get call details to mark receiver as in call
  const callRef = ref(rtdb, `calls/${callId}`);
  const callSnapshot = await get(callRef);
  const call = callSnapshot.val();
  
  if (call) {
    await update(ref(rtdb, `status/${call.receiverId}`), { inCall: true });
  }
};

// Reject a call
export const rejectCall = async (callId: string): Promise<void> => {
  const callRef = ref(rtdb, `calls/${callId}`);
  const callSnapshot = await get(callRef);
  const call = callSnapshot.val();
  
  await update(callRef, { status: "rejected" });
  
  // Clear in-call status
  if (call) {
    await update(ref(rtdb, `status/${call.callerId}`), { inCall: false });
  }
};

// End a call
export const endCall = async (callId: string, duration?: number): Promise<void> => {
  const callRef = ref(rtdb, `calls/${callId}`);
  const callSnapshot = await get(callRef);
  const call = callSnapshot.val();
  
  await update(callRef, { 
    status: "ended",
    ...(duration && { duration }),
  });
  
  // Clear in-call status for both users
  if (call) {
    await update(ref(rtdb, `status/${call.callerId}`), { inCall: false });
    await update(ref(rtdb, `status/${call.receiverId}`), { inCall: false });
  }
  
  // Store in call history
  if (call) {
    await saveCallHistory(call.callerId, call.receiverId, call.type, duration || 0, "completed");
    await saveCallHistory(call.receiverId, call.callerId, call.type, duration || 0, "completed");
  }
};

// Save call to history
const saveCallHistory = async (
  userId: string,
  otherUserId: string,
  type: "audio" | "video",
  duration: number,
  status: string
) => {
  const historyRef = ref(rtdb, `callHistory/${userId}`);
  const newHistoryRef = push(historyRef);
  
  await set(newHistoryRef, {
    otherUserId,
    type,
    duration,
    status,
    timestamp: Date.now(),
  });
};

// Send ICE candidate
export const sendIceCandidate = async (
  callId: string,
  senderId: string,
  candidate: RTCIceCandidate
): Promise<void> => {
  const candidatesRef = ref(rtdb, `calls/${callId}/iceCandidates/${senderId}`);
  const newCandidateRef = push(candidatesRef);
  
  await set(newCandidateRef, {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
  });
};

// Listen to call updates
export const listenToCallUpdates = (
  callId: string,
  callback: (call: Call | null) => void
): (() => void) => {
  const callRef = ref(rtdb, `calls/${callId}`);
  
  const unsubscribe = onValue(callRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.key, ...snapshot.val() });
    } else {
      callback(null);
    }
  });
  
  return () => off(callRef);
};

// Listen for incoming calls
export const listenForIncomingCalls = (
  userId: string,
  callback: (call: Call | null) => void
): (() => void) => {
  const callsRef = ref(rtdb, "calls");
  
  const unsubscribe = onValue(callsRef, (snapshot) => {
    let incomingCall: Call | null = null;
    
    snapshot.forEach((child) => {
      const call = child.val();
      if (call.receiverId === userId && call.status === "ringing") {
        incomingCall = { id: child.key, ...call };
      }
    });
    
    callback(incomingCall);
  });
  
  return () => off(callsRef);
};

// Listen to ICE candidates
export const listenToIceCandidates = (
  callId: string,
  otherUserId: string,
  callback: (candidate: IceCandidate) => void
): (() => void) => {
  const candidatesRef = ref(rtdb, `calls/${callId}/iceCandidates/${otherUserId}`);
  
  const unsubscribe = onValue(candidatesRef, (snapshot) => {
    snapshot.forEach((child) => {
      callback(child.val());
    });
  });
  
  return () => off(candidatesRef);
};

// Get call history
export const getCallHistory = async (userId: string): Promise<any[]> => {
  const historyRef = ref(rtdb, `callHistory/${userId}`);
  const snapshot = await get(historyRef);
  
  const history: any[] = [];
  snapshot.forEach((child) => {
    history.push({ id: child.key, ...child.val() });
  });
  
  return history.sort((a, b) => b.timestamp - a.timestamp);
};
