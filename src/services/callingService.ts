// Calling signaling over Supabase Realtime (replaces Firebase RTDB which was permission-denied).
// Uses broadcast channels per-user (for ringing) and per-call (for offer/answer/ICE exchange).
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

export const iceServers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

/* ---------------- channel registry ---------------- */
const callChannels = new Map<string, RealtimeChannel>();
const userChannels = new Map<string, RealtimeChannel>();
const callMemory = new Map<string, Call>();

const userChan = (userId: string) => `user-calls:${userId}`;
const callChan = (callId: string) => `call:${callId}`;

const ensureCallChannel = (callId: string): RealtimeChannel => {
  let ch = callChannels.get(callId);
  if (ch) return ch;
  ch = supabase.channel(callChan(callId), { config: { broadcast: { self: false } } });
  callChannels.set(callId, ch);
  ch.subscribe();
  return ch;
};

const ensureUserChannel = (userId: string): RealtimeChannel => {
  let ch = userChannels.get(userId);
  if (ch) return ch;
  ch = supabase.channel(userChan(userId), { config: { broadcast: { self: false } } });
  userChannels.set(userId, ch);
  return ch;
};

/* ---------------- API ---------------- */

export const startCall = async (
  callerId: string,
  receiverId: string,
  type: "audio" | "video",
  offer: RTCSessionDescriptionInit
): Promise<string> => {
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const call: Call = { id: callId, callerId, receiverId, type, offer, status: "ringing", timestamp: Date.now() };
  callMemory.set(callId, call);

  // Open the per-call channel
  ensureCallChannel(callId);

  // Notify receiver via their personal channel
  const receiverCh = supabase.channel(userChan(receiverId));
  await new Promise<void>((resolve) => {
    receiverCh.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
    setTimeout(() => resolve(), 1500);
  });
  await receiverCh.send({ type: "broadcast", event: "incoming_call", payload: call });
  supabase.removeChannel(receiverCh);

  console.log("[CallingService] startCall sent ring to", receiverId, "callId", callId);
  return callId;
};

export const acceptCall = async (callId: string, answer: RTCSessionDescriptionInit): Promise<void> => {
  const ch = ensureCallChannel(callId);
  const stored = callMemory.get(callId);
  if (stored) {
    stored.answer = answer;
    stored.status = "accepted";
  }
  await ch.send({ type: "broadcast", event: "answer", payload: { callId, answer, status: "accepted" } });
};

export const rejectCall = async (callId: string): Promise<void> => {
  const ch = ensureCallChannel(callId);
  await ch.send({ type: "broadcast", event: "status", payload: { callId, status: "rejected" } });
  const stored = callMemory.get(callId);
  if (stored) stored.status = "rejected";
};

export const endCall = async (callId: string, duration?: number): Promise<void> => {
  const ch = ensureCallChannel(callId);
  await ch.send({ type: "broadcast", event: "status", payload: { callId, status: "ended", duration } });
  const stored = callMemory.get(callId);
  if (stored) {
    stored.status = "ended";
    stored.duration = duration;
  }
  // teardown
  setTimeout(() => {
    const c = callChannels.get(callId);
    if (c) {
      supabase.removeChannel(c);
      callChannels.delete(callId);
    }
    callMemory.delete(callId);
  }, 2000);
};

export const sendIceCandidate = async (
  callId: string,
  senderId: string,
  candidate: RTCIceCandidate
): Promise<void> => {
  const ch = ensureCallChannel(callId);
  await ch.send({
    type: "broadcast",
    event: "ice",
    payload: {
      callId,
      senderId,
      candidate: { candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex },
    },
  });
};

export const listenToCallUpdates = (callId: string, callback: (call: Call | null) => void): (() => void) => {
  const ch = ensureCallChannel(callId);
  const handler = (payload: any) => {
    const p = payload.payload;
    const stored = callMemory.get(callId) || ({ id: callId } as Call);
    const merged: Call = { ...stored, ...p, id: callId };
    callMemory.set(callId, merged);
    callback(merged);
  };
  ch.on("broadcast", { event: "answer" }, handler);
  ch.on("broadcast", { event: "status" }, handler);
  return () => {
    // Channel removed by endCall
  };
};

export const listenForIncomingCalls = (
  userId: string,
  callback: (call: Call | null) => void
): (() => void) => {
  const ch = ensureUserChannel(userId);
  ch.on("broadcast", { event: "incoming_call" }, (payload: any) => {
    const call = payload.payload as Call;
    callMemory.set(call.id!, call);
    // Open per-call channel so we can receive ICE candidates from caller right away
    ensureCallChannel(call.id!);
    callback(call);
  });
  ch.subscribe();
  return () => {
    const c = userChannels.get(userId);
    if (c) {
      supabase.removeChannel(c);
      userChannels.delete(userId);
    }
  };
};

export const listenToIceCandidates = (
  callId: string,
  otherUserId: string,
  callback: (candidate: IceCandidate) => void
): (() => void) => {
  const ch = ensureCallChannel(callId);
  ch.on("broadcast", { event: "ice" }, (payload: any) => {
    const p = payload.payload;
    if (p.senderId === otherUserId && p.candidate) {
      callback(p.candidate);
    }
  });
  return () => {};
};
