import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatPrefs {
  nickname?: string | null;
  theme?: string | null;
  quick_reactions?: string[] | null;
}

export const DEFAULT_QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

export const CHAT_THEMES: { id: string; label: string; gradient: string }[] = [
  { id: "coral", label: "Coral", gradient: "linear-gradient(135deg,#FF4F5A,#FF8A3D)" },
  { id: "ocean", label: "Ocean", gradient: "linear-gradient(135deg,#2563eb,#06b6d4)" },
  { id: "violet", label: "Violet", gradient: "linear-gradient(135deg,#7c3aed,#ec4899)" },
  { id: "sunset", label: "Sunset", gradient: "linear-gradient(135deg,#f97316,#eab308)" },
  { id: "forest", label: "Forest", gradient: "linear-gradient(135deg,#059669,#84cc16)" },
  { id: "noir", label: "Noir", gradient: "linear-gradient(135deg,#27272a,#52525b)" },
  { id: "rose", label: "Rose", gradient: "linear-gradient(135deg,#f43f5e,#fb7185)" },
  { id: "sky", label: "Sky", gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)" },
  { id: "emerald", label: "Emerald", gradient: "linear-gradient(135deg,#10b981,#34d399)" },
  { id: "lava", label: "Lava", gradient: "linear-gradient(135deg,#dc2626,#f59e0b)" },
  { id: "grape", label: "Grape", gradient: "linear-gradient(135deg,#6d28d9,#a855f7)" },
  { id: "mint", label: "Mint", gradient: "linear-gradient(135deg,#14b8a6,#86efac)" },
];

export const themeGradient = (id?: string | null) =>
  CHAT_THEMES.find((t) => t.id === id)?.gradient || CHAT_THEMES[0].gradient;

export const useChatPreferences = (conversationId: string | null) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ChatPrefs>({});
  const [loading, setLoading] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user?.id || !conversationId) return;
    const { data } = await supabase
      .from("chat_preferences" as any)
      .select("nickname, theme, quick_reactions")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    setPrefs(((data as any) || {}) as ChatPrefs);
  }, [user?.id, conversationId]);

  useEffect(() => {
    if (!user?.id || !conversationId) {
      setPrefs({});
      return;
    }
    setLoading(true);
    fetchPrefs().finally(() => setLoading(false));

    const eventName = `chat_prefs_${user.id}_${conversationId}`;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ChatPrefs;
      if (detail) setPrefs((p) => ({ ...p, ...detail }));
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [user?.id, conversationId, fetchPrefs]);

  const update = useCallback(
    async (patch: ChatPrefs) => {
      if (!user?.id || !conversationId) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      // Broadcast within tab so all consumers update instantly
      window.dispatchEvent(
        new CustomEvent(`chat_prefs_${user.id}_${conversationId}`, { detail: next })
      );
      await supabase.from("chat_preferences" as any).upsert(
        {
          user_id: user.id,
          conversation_id: conversationId,
          nickname: next.nickname ?? null,
          theme: next.theme ?? null,
          quick_reactions: next.quick_reactions ?? null,
        },
        { onConflict: "user_id,conversation_id" } as any
      );
    },
    [user?.id, conversationId, prefs]
  );

  return { prefs, loading, update };
};

/** Pin/unpin a message on a conversation (shared for both participants). */
export const usePinnedMessage = (conversationId: string | null) => {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setPinnedId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations" as any)
        .select("pinned_message_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!cancelled) setPinnedId(((data as any)?.pinned_message_id as string) || null);
    })();

    const ch = supabase
      .channel(`conv-pin-${conversationId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
        (payload: any) => setPinnedId(payload.new?.pinned_message_id || null)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  const pin = useCallback(
    async (messageId: string | null) => {
      if (!conversationId) return;
      setPinnedId(messageId);
      await supabase
        .from("conversations" as any)
        .update({ pinned_message_id: messageId })
        .eq("id", conversationId);
    },
    [conversationId]
  );

  return { pinnedId, pin };
};
