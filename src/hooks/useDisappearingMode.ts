import { useEffect, useState, useCallback } from "react";

const KEY = (cid: string) => `disappearing_${cid}`;
const STAR_KEY = (uid: string) => `starred_messages_${uid}`;

export const DISAPPEAR_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 60 * 60, label: "1 hour" },
  { value: 24 * 60 * 60, label: "24 hours" },
  { value: 7 * 24 * 60 * 60, label: "7 days" },
];

export const useDisappearingMode = (conversationId: string | null) => {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    if (!conversationId) { setSeconds(0); return; }
    const v = localStorage.getItem(KEY(conversationId));
    setSeconds(v ? Number(v) || 0 : 0);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(conversationId)) setSeconds(Number(e.newValue) || 0);
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conversationId === conversationId) setSeconds(detail.seconds);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("disappearing_changed", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("disappearing_changed", onCustom as EventListener);
    };
  }, [conversationId]);

  const setDisappearing = useCallback((s: number) => {
    if (!conversationId) return;
    localStorage.setItem(KEY(conversationId), String(s));
    setSeconds(s);
    window.dispatchEvent(new CustomEvent("disappearing_changed", { detail: { conversationId, seconds: s } }));
  }, [conversationId]);

  return { seconds, setDisappearing };
};

export const useStarredMessages = (userId?: string) => {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) { setIds(new Set()); return; }
    try {
      const raw = localStorage.getItem(STAR_KEY(userId));
      setIds(new Set(raw ? JSON.parse(raw) : []));
    } catch { setIds(new Set()); }
  }, [userId]);

  const toggle = useCallback((id: string) => {
    if (!userId) return;
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(STAR_KEY(userId), JSON.stringify(Array.from(next)));
      return next;
    });
  }, [userId]);

  return { starredIds: ids, toggleStar: toggle, isStarred: (id: string) => ids.has(id) };
};
