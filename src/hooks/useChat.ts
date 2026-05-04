import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  is_read: boolean | null;
}

/** Find or create a 1:1 conversation between current user and otherUserId. */
export const useDirectConversation = (otherUserId?: string) => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !otherUserId) {
      setConversationId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Find conversations the current user is in
      const { data: mine } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", user.id);

      const ids = (mine as any[] | null)?.map((r) => r.conversation_id) || [];
      let foundId: string | null = null;

      if (ids.length > 0) {
        const { data: shared } = await supabase
          .from("conversation_participants" as any)
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", ids);
        foundId = (shared as any[] | null)?.[0]?.conversation_id || null;
      }

      if (!foundId) {
        const { data: convo, error } = await supabase
          .from("conversations" as any)
          .insert({})
          .select("id")
          .single();
        if (error || !convo) {
          if (!cancelled) setLoading(false);
          return;
        }
        foundId = (convo as any).id;
        await supabase.from("conversation_participants" as any).insert([
          { conversation_id: foundId, user_id: user.id },
          { conversation_id: foundId, user_id: otherUserId },
        ]);
      }

      if (!cancelled) {
        setConversationId(foundId);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, otherUserId]);

  return { conversationId, loading };
};

/** Realtime messages + send helpers for a Supabase conversation. */
export const useChat = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Initial load + realtime subscribe
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages(((data as any[]) || []) as ChatMessage[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? (payload.new as ChatMessage) : m))
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendText = useCallback(
    async (text: string) => {
      if (!conversationId || !user?.id || !text.trim()) return;
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: text.trim(),
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages" as any)
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: text.trim(),
        })
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as unknown as ChatMessage) : m)));
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId, user?.id]
  );

  const sendMedia = useCallback(
    async (file: File) => {
      if (!conversationId || !user?.id) return;
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file);
      if (upErr) return;
      const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "file";
      await supabase.from("messages" as any).insert({
        conversation_id: conversationId,
        sender_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
      });
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId, user?.id]
  );

  return { messages, loading, sendText, sendMedia };
};

/** Build a map of friendId -> {lastMessage, lastTime, unread} via one query. */
export const useChatPreviews = (friendIds: string[]) => {
  const { user } = useAuth();
  const [previews, setPreviews] = useState<
    Record<string, { lastMessage?: string; lastMessageTime?: number; unreadCount: number; conversationId?: string }>
  >({});

  useEffect(() => {
    if (!user?.id || friendIds.length === 0) {
      setPreviews({});
      return;
    }
    let cancelled = false;

    const load = async () => {
      // Get all my conversations
      const { data: myParts } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", user.id);
      const convIds = (myParts as any[] | null)?.map((r) => r.conversation_id) || [];
      if (convIds.length === 0) {
        if (!cancelled) setPreviews({});
        return;
      }

      // Map friend -> conversation
      const { data: otherParts } = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .in("user_id", friendIds);

      const convoToFriend: Record<string, string> = {};
      (otherParts as any[] | null)?.forEach((r) => {
        convoToFriend[r.conversation_id] = r.user_id;
      });
      const relevantConvIds = Object.keys(convoToFriend);
      if (relevantConvIds.length === 0) {
        if (!cancelled) setPreviews({});
        return;
      }

      // Pull recent messages for these conversations
      const { data: msgs } = await supabase
        .from("messages" as any)
        .select("id, conversation_id, sender_id, content, media_type, created_at, is_read")
        .in("conversation_id", relevantConvIds)
        .order("created_at", { ascending: false })
        .limit(500);

      const next: typeof previews = {};
      (msgs as any[] | null)?.forEach((m) => {
        const fid = convoToFriend[m.conversation_id];
        if (!fid) return;
        if (!next[fid]) {
          next[fid] = {
            conversationId: m.conversation_id,
            lastMessage:
              m.content || (m.media_type ? `Sent ${m.media_type}` : undefined),
            lastMessageTime: new Date(m.created_at).getTime(),
            unreadCount: 0,
          };
        }
        if (m.sender_id !== user.id && !m.is_read) {
          next[fid].unreadCount += 1;
        }
      });
      // Ensure all friend entries exist (with conversation id if known)
      friendIds.forEach((fid) => {
        if (!next[fid]) {
          const convId = Object.entries(convoToFriend).find(([, f]) => f === fid)?.[0];
          next[fid] = { conversationId: convId, unreadCount: 0 };
        }
      });
      if (!cancelled) setPreviews(next);
    };

    load();

    const channel = supabase
      .channel(`chat-previews-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, friendIds.join(",")]);

  return previews;
};
