import { useCallback, useEffect, useState } from "react";

/** Per-user "delete for me" — client-side hidden message IDs. */
export const useHiddenMessages = (userId?: string | null) => {
  const key = userId ? `chat_hidden_${userId}` : null;
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!key) return setHidden(new Set());
    try {
      const raw = localStorage.getItem(key);
      setHidden(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setHidden(new Set());
    }
  }, [key]);

  const persist = useCallback(
    (next: Set<string>) => {
      setHidden(new Set(next));
      if (key) localStorage.setItem(key, JSON.stringify(Array.from(next)));
    },
    [key]
  );

  const hide = useCallback(
    (id: string) => {
      const next = new Set(hidden);
      next.add(id);
      persist(next);
    },
    [hidden, persist]
  );

  const hideMany = useCallback(
    (ids: string[]) => {
      const next = new Set(hidden);
      ids.forEach((id) => next.add(id));
      persist(next);
    },
    [hidden, persist]
  );

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return { hide, hideMany, isHidden, hidden };
};
