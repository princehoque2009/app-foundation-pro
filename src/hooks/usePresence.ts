import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceStatus {
  is_online: boolean;
  last_seen: string;
  typing_in_conversation?: string | null;
}

/** Set the current user's typing indicator for a given conversation (or null to clear). */
export const setTypingStatus = async (userId: string, conversationId: string | null) => {
  await supabase
    .from("user_status" as any)
    .upsert(
      {
        user_id: userId,
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        typing_in_conversation: conversationId,
      } as any,
      { onConflict: "user_id" }
    );
};

/** Upserts the current user's presence and keeps it fresh while tab is open. */
export const useSelfPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const setStatus = async (online: boolean) => {
      if (cancelled) return;
      await supabase
        .from("user_status" as any)
        .upsert(
          { user_id: user.id, is_online: online, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id" }
        );
    };

    setStatus(true);
    const heartbeat = window.setInterval(() => setStatus(true), 45_000);

    const handleVis = () => setStatus(!document.hidden);
    const handleLeave = () => setStatus(false);

    document.addEventListener("visibilitychange", handleVis);
    window.addEventListener("beforeunload", handleLeave);
    window.addEventListener("pagehide", handleLeave);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("beforeunload", handleLeave);
      window.removeEventListener("pagehide", handleLeave);
      setStatus(false);
    };
  }, [user?.id]);
};

/** Subscribe to presence updates for a list of user IDs. */
export const usePresence = (userIds: string[]) => {
  const [statuses, setStatuses] = useState<Record<string, PresenceStatus>>({});

  useEffect(() => {
    if (userIds.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("user_status" as any)
        .select("user_id, is_online, last_seen, typing_in_conversation")
        .in("user_id", userIds);
      if (cancelled || !data) return;
      const next: Record<string, PresenceStatus> = {};
      (data as any[]).forEach((row) => {
        next[row.user_id] = {
          is_online: row.is_online,
          last_seen: row.last_seen,
          typing_in_conversation: row.typing_in_conversation,
        };
      });
      setStatuses(next);
    })();

    const channel = supabase
      .channel(`presence-${userIds.slice(0, 5).join("-")}-${userIds.length}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "user_status" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row || !userIds.includes(row.user_id)) return;
          setStatuses((prev) => ({
            ...prev,
            [row.user_id]: {
              is_online: !!row.is_online,
              last_seen: row.last_seen,
              typing_in_conversation: row.typing_in_conversation,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userIds.join(",")]);

  return statuses;
};

export const formatLastSeen = (status?: PresenceStatus) => {
  if (!status) return "Offline";
  if (status.is_online) return "Active now";
  if (!status.last_seen) return "Offline";
  const diff = Date.now() - new Date(status.last_seen).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Active just now";
  if (m < 60) return `Active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Active ${h}h ago`;
  const d = Math.floor(h / 24);
  return `Active ${d}d ago`;
};
