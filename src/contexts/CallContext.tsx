import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { CallInterface } from "@/components/calling/CallInterface";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type CallContextValue = ReturnType<typeof useWebRTC> & {
  startAudioCall: (receiverId: string, conversationId?: string | null) => Promise<void>;
  startVideoCall: (receiverId: string, conversationId?: string | null) => Promise<void>;
  /** Map of receiverId -> friend profile shown in call UI */
  setCallProfile: (p: { id: string; username: string; display_name?: string; avatar_url?: string } | null) => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const rtc = useWebRTC();
  const profileRef = useRef<{ id: string; username: string; display_name?: string; avatar_url?: string } | null>(null);
  const conversationRef = useRef<string | null>(null);
  const lastLoggedRef = useRef<string | null>(null);
  const incomingProfileRef = useRef<typeof profileRef.current>(null);

  const writeCallLog = async (
    conversationId: string,
    senderId: string,
    callType: "audio" | "video",
    callStatus: "started" | "missed" | "declined" | "ended",
    duration?: number
  ) => {
    try {
      await supabase.from("messages" as any).insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: "call_log",
        call_type: callType,
        call_status: callStatus,
        call_duration: duration ?? null,
        content: null,
      });
      await supabase.from("conversations" as any).update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    } catch (e) {
      console.error("[CallContext] writeCallLog failed", e);
    }
  };

  const ensureConversation = async (otherId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc("get_or_create_direct_conversation" as any, { p_other_user: otherId });
    if (error) {
      console.error("ensureConversation failed", error);
      return null;
    }
    return (data as unknown as string) || null;
  };

  const startAudioCall = async (receiverId: string, conversationId?: string | null) => {
    const convId = conversationId || (await ensureConversation(receiverId));
    conversationRef.current = convId;
    lastLoggedRef.current = null;
    if (convId && user?.id) {
      await writeCallLog(convId, user.id, "audio", "started");
    }
    await rtc.initiateCall(receiverId, "audio");
  };

  const startVideoCall = async (receiverId: string, conversationId?: string | null) => {
    const convId = conversationId || (await ensureConversation(receiverId));
    conversationRef.current = convId;
    lastLoggedRef.current = null;
    if (convId && user?.id) {
      await writeCallLog(convId, user.id, "video", "started");
    }
    await rtc.initiateCall(receiverId, "video");
  };

  // When a call ends, log a final entry with duration / missed / declined
  const prevStatus = useRef(rtc.callStatus);
  useEffect(() => {
    const prev = prevStatus.current;
    const cur = rtc.callStatus;
    prevStatus.current = cur;

    if (cur === "ended" && prev !== "ended" && rtc.currentCall) {
      const callId = rtc.currentCall.id || "";
      if (lastLoggedRef.current === callId) return;
      lastLoggedRef.current = callId;

      const isCaller = rtc.currentCall.callerId === user?.id;
      const otherId = isCaller ? rtc.currentCall.receiverId : rtc.currentCall.callerId;
      const callType = rtc.currentCall.type;
      const duration = rtc.callDuration;
      const wasConnected = duration > 0;

      (async () => {
        const convId = conversationRef.current || (await ensureConversation(otherId));
        if (!convId || !user?.id) return;
        if (wasConnected) {
          await writeCallLog(convId, user.id, callType, "ended", duration);
        } else if (isCaller) {
          // outgoing not answered → declined or missed by other
          await writeCallLog(convId, user.id, callType, "missed");
        } else {
          await writeCallLog(convId, user.id, callType, "declined");
        }
      })();
    }
  }, [rtc.callStatus, rtc.currentCall, rtc.callDuration, user?.id]);

  // Fetch profile for incoming caller
  useEffect(() => {
    const incoming = rtc.incomingCall;
    if (!incoming) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", incoming.callerId)
        .single();
      if (data) incomingProfileRef.current = data as any;
    })();
  }, [rtc.incomingCall?.id]);

  const setCallProfile = (p: typeof profileRef.current) => {
    profileRef.current = p;
  };

  // Determine which profile to show in CallInterface
  const activeProfile = rtc.incomingCall && !rtc.currentCall
    ? incomingProfileRef.current || undefined
    : profileRef.current || undefined;

  return (
    <CallContext.Provider value={{ ...rtc, startAudioCall, startVideoCall, setCallProfile }}>
      {children}
      <CallInterface profile={activeProfile || undefined} />
    </CallContext.Provider>
  );
};
