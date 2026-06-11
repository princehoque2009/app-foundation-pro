import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { encryptText, decryptText, isEncrypted } from "@/lib/chatCrypto";


export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  is_read: boolean | null;
  reply_to_id?: string | null;
  reply_to_story_id?: string | null;
  message_type?: string | null;
  call_type?: "audio" | "video" | null;
  call_status?: "started" | "missed" | "declined" | "ended" | null;
  call_duration?: number | null;
  is_deleted?: boolean | null;
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
      const { data, error } = await supabase.rpc("get_or_create_direct_conversation" as any, {
        p_other_user: otherUserId,
      });
      if (cancelled) return;
      if (error) {
        console.error("get_or_create_direct_conversation failed", error);
        setLoading(false);
        return;
      }
      setConversationId((data as unknown as string) || null);
      setLoading(false);
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

    const load = async () => {
      const { data } = await supabase
        .from("messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      const rows = ((data as any[]) || []) as ChatMessage[];
      const decrypted = await Promise.all(
        rows.map(async (m) => ({
          ...m,
          content: m.content ? await decryptText(conversationId, m.content) : m.content,
        }))
      );
      if (!cancelled) {
        setMessages(decrypted);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload: any) => {
          const row = payload.new as ChatMessage;
          const content = row.content ? await decryptText(conversationId, row.content) : row.content;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, content }];
          });
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload: any) => {
          const row = payload.new as ChatMessage;
          const content = row.content ? await decryptText(conversationId, row.content) : row.content;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...row, content } : m)));
        }
      )
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [conversationId]);

  const sendText = useCallback(
    async (text: string, replyToId?: string | null) => {
      if (!conversationId || !user?.id || !text.trim()) return;
      const plain = text.trim();
      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: plain,
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: replyToId || null,
      };
      setMessages((prev) => [...prev, optimistic]);

      const cipher = await encryptText(conversationId, plain);
      const { data, error } = await supabase
        .from("messages" as any)
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: cipher,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      const row = data as unknown as ChatMessage;
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...row, content: plain } : m))
      );
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId, user?.id]
  );

  const sendMedia = useCallback(
    async (file: File, replyToId?: string | null) => {
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
        reply_to_id: replyToId || null,
      });
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId, user?.id]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true, content: null, media_url: null } : m))
      );
      await supabase
        .from("messages" as any)
        .update({ is_deleted: true, content: null, media_url: null })
        .eq("id", messageId);
    },
    []
  );

  const forwardMessage = useCallback(
    async (msg: ChatMessage, toConversationId: string) => {
      if (!user?.id || !toConversationId) return;
      const content = msg.content ? await encryptText(toConversationId, msg.content) : null;
      await supabase.from("messages" as any).insert({
        conversation_id: toConversationId,
        sender_id: user.id,
        content,
        media_url: msg.media_url,
        media_type: msg.media_type,
      });
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", toConversationId);
    },
    [user?.id]
  );

  return { messages, loading, sendText, sendMedia, deleteMessage, forwardMessage };
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
          const encrypted = isEncrypted(m.content);
          next[fid] = {
            conversationId: m.conversation_id,
            lastMessage:
              encrypted ? "🔒 Encrypted message" :
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
      // Best-effort decrypt the encrypted previews
      await Promise.all(
        Object.values(next).map(async (entry) => {
          if (entry.lastMessage === "🔒 Encrypted message" && entry.conversationId) {
            const raw = (msgs as any[] | null)?.find(
              (m) => m.conversation_id === entry.conversationId
            )?.content;
            if (raw && isEncrypted(raw)) {
              try { entry.lastMessage = await decryptText(entry.conversationId, raw); } catch {}
            }
          }
        })
      );
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
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "messages" },
        () => load()
      )
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [user?.id, friendIds.join(",")]);

  return previews;
};
