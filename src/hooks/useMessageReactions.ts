import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MsgReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
export const REACTION_OPTIONS = REACTIONS;

export const useMessageReactions = (messageIds: string[]) => {
  const { user } = useAuth();
  const [byMsg, setByMsg] = useState<Record<string, MsgReaction[]>>({});

  const load = useCallback(async () => {
    if (messageIds.length === 0) {
      setByMsg({});
      return;
    }
    const { data } = await supabase
      .from("message_reactions" as any)
      .select("id, message_id, user_id, reaction")
      .in("message_id", messageIds);
    const next: Record<string, MsgReaction[]> = {};
    ((data as any[]) || []).forEach((r) => {
      (next[r.message_id] ||= []).push(r);
    });
    setByMsg(next);
  }, [messageIds.join(",")]);

  useEffect(() => {
    load();
    if (messageIds.length === 0) return;
    const channel = supabase
      .channel(`msg-reactions-${messageIds[0]}-${messageIds.length}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row || !messageIds.includes(row.message_id)) return;
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, messageIds.join(",")]);

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) return;
      const existing = byMsg[messageId]?.find((r) => r.user_id === user.id);
      if (existing) {
        // Remove existing first
        await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
        if (existing.reaction === emoji) return; // toggle off
      }
      await supabase
        .from("message_reactions" as any)
        .insert({ message_id: messageId, user_id: user.id, reaction: emoji });
    },
    [byMsg, user?.id]
  );

  return { byMsg, react };
};
