import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Requests browser notification permission once and shows desktop notifications
 * for new direct messages received while the tab is unfocused.
 */
export const useBrowserNotifications = () => {
  const { user } = useAuth();
  const requestedRef = useRef(false);

  // Ask permission once after login
  useEffect(() => {
    if (!user?.id || requestedRef.current) return;
    requestedRef.current = true;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [user?.id]);

  // Subscribe to messages addressed to me
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`browser-notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m: any = payload.new;
          if (!m || m.sender_id === user.id) return;
          // Verify I'm a participant
          const { data: parts } = await supabase
            .from("conversation_participants" as any)
            .select("user_id")
            .eq("conversation_id", m.conversation_id);
          const ids = (parts as any[] | null)?.map((p) => p.user_id) || [];
          if (!ids.includes(user.id)) return;

          // Fetch sender profile
          const { data: sender } = await supabase
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", m.sender_id)
            .single();

          const title = sender?.display_name || sender?.username || "New message";
          const body =
            m.message_type === "call_log"
              ? `${m.call_type === "video" ? "Video" : "Voice"} call`
              : m.content || (m.media_type ? `Sent ${m.media_type}` : "New message");

          // Only show desktop notif when tab not focused
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
            try {
              const n = new Notification(title, {
                body,
                icon: sender?.avatar_url || "/pwa-icon-192.png",
                badge: "/pwa-icon-192.png",
                tag: m.conversation_id,
              });
              n.onclick = () => {
                window.focus();
                window.location.href = `/messages?friend=${m.sender_id}`;
                n.close();
              };
            } catch {}
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
