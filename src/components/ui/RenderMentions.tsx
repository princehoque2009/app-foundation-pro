import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { memo, useCallback } from "react";

interface RenderMentionsProps {
  text: string;
}

export const RenderMentions = memo(({ text }: RenderMentionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract all @mentions from text
  const mentionPattern = /@(\w+)/g;
  const usernames = Array.from(text.matchAll(mentionPattern)).map(m => m[1]);

  const { data: mentionedUsers } = useQuery({
    queryKey: ["mentioned-users", usernames.join(",")],
    queryFn: async () => {
      if (usernames.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("username", usernames);
      return data || [];
    },
    enabled: usernames.length > 0,
    staleTime: 60000,
  });

  const handleMentionClick = useCallback(async (userId: string) => {
    // Send notification
    if (user?.id && user.id !== userId) {
      try {
        await supabase.rpc("create_notification", {
          p_user_id: userId,
          p_from_user_id: user.id,
          p_type: "mention",
          p_title: "You were mentioned",
          p_message: "Someone mentioned you",
          p_action_url: `/profile/${userId}`,
        });
      } catch (e) {
        // Silently fail - notification is not critical
      }
    }
    navigate(`/profile/${userId}`);
  }, [navigate, user?.id]);

  if (usernames.length === 0) return <>{text}</>;

  const parts = text.split(/(@\w+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const username = part.slice(1);
          const found = mentionedUsers?.find(u => u.username === username);
          if (found) {
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMentionClick(found.id);
                }}
                className="text-primary font-semibold hover:underline cursor-pointer inline"
              >
                {part}
              </button>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
});

RenderMentions.displayName = "RenderMentions";
