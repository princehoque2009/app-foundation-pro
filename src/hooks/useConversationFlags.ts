import { useCallback, useEffect, useState } from "react";

export interface ConversationFlags {
  pinned?: boolean;
  archived?: boolean;
  favourite?: boolean;
  locked?: boolean;
  markedUnread?: boolean;
  disappearingSeconds?: number; // 0 = off
}

const keyFor = (userId: string, friendId: string) =>
  `chat_flags_${userId}_${friendId}`;

export const getConversationFlags = (userId: string, friendId: string): ConversationFlags => {
  try {
    const raw = localStorage.getItem(keyFor(userId, friendId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setConversationFlags = (
  userId: string,
  friendId: string,
  patch: ConversationFlags
) => {
  const current = getConversationFlags(userId, friendId);
  const next = { ...current, ...patch };
  localStorage.setItem(keyFor(userId, friendId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(`chat_flags_${userId}_${friendId}`, { detail: next }));
  window.dispatchEvent(new CustomEvent("chat_flags_changed"));
  return next;
};

export const useConversationFlags = (
  userId: string | undefined,
  friendId: string | undefined
) => {
  const [flags, setFlags] = useState<ConversationFlags>(() =>
    userId && friendId ? getConversationFlags(userId, friendId) : {}
  );

  useEffect(() => {
    if (!userId || !friendId) return;
    setFlags(getConversationFlags(userId, friendId));
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as ConversationFlags;
      if (d) setFlags(d);
    };
    const evt = `chat_flags_${userId}_${friendId}`;
    window.addEventListener(evt, handler);
    return () => window.removeEventListener(evt, handler);
  }, [userId, friendId]);

  const update = useCallback(
    (patch: ConversationFlags) => {
      if (!userId || !friendId) return;
      setConversationFlags(userId, friendId, patch);
    },
    [userId, friendId]
  );

  return { flags, update };
};

export const useAllConversationFlags = (userId: string | undefined, friendIds: string[]) => {
  const [map, setMap] = useState<Record<string, ConversationFlags>>({});

  useEffect(() => {
    if (!userId) {
      setMap({});
      return;
    }
    const load = () => {
      const next: Record<string, ConversationFlags> = {};
      friendIds.forEach((fid) => {
        next[fid] = getConversationFlags(userId, fid);
      });
      setMap(next);
    };
    load();
    const handler = () => load();
    window.addEventListener("chat_flags_changed", handler);
    return () => window.removeEventListener("chat_flags_changed", handler);
  }, [userId, friendIds.join(",")]);

  return map;
};
