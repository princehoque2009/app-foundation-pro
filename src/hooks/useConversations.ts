import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      try {
        // 1. My conversation IDs
        const { data: myParts, error: mErr }: any = await supabase
          .from("conversation_participants" as any)
          .select("conversation_id")
          .eq("user_id", user?.id);
        if (mErr) throw mErr;
        const convIds = (myParts || []).map((r: any) => r.conversation_id);
        if (convIds.length === 0) return [];

        // 2. Other participants in those conversations (no FK embed)
        const { data: otherParts, error: oErr }: any = await supabase
          .from("conversation_participants" as any)
          .select("conversation_id, user_id")
          .in("conversation_id", convIds)
          .neq("user_id", user?.id);
        if (oErr) throw oErr;

        const otherUserIds: string[] = Array.from(new Set((otherParts || []).map((p: any) => p.user_id as string)));

        // 3. Profiles in one query
        const { data: profiles }: any = otherUserIds.length
          ? await supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url, is_verified")
              .in("id", otherUserIds)
          : { data: [] };
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

        // 4. Last message per conversation in one query
        const { data: msgs }: any = await supabase
          .from("messages" as any)
          .select("id, conversation_id, sender_id, content, media_type, created_at, is_read")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(500);
        const lastMsgMap: Record<string, any> = {};
        (msgs || []).forEach((m: any) => {
          if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
        });

        return (otherParts || [])
          .map((p: any) => ({
            id: p.conversation_id,
            otherUser: profileMap[p.user_id] || null,
            lastMessage: lastMsgMap[p.conversation_id] || null,
          }))
          .filter((c: any) => c.otherUser);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const createConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      try {
        // Check if conversation already exists
        const { data: existing }: any = await supabase
          .from("conversation_participants" as any)
          .select("conversation_id")
          .eq("user_id", user?.id);

        if (existing) {
          for (const conv of existing) {
            const { data: otherParticipant }: any = await supabase
              .from("conversation_participants" as any)
              .select("user_id")
              .eq("conversation_id", conv.conversation_id)
              .eq("user_id", otherUserId)
              .maybeSingle();

            if (otherParticipant) {
              return conv.conversation_id;
            }
          }
        }

        // Create new conversation
        const { data: conversation, error: convError }: any = await supabase
          .from("conversations" as any)
          .insert({})
          .select()
          .single();

        if (convError) throw convError;
        if (!conversation) throw new Error("Failed to create conversation");

        // Add participants
        const { error: participantsError } = await supabase
          .from("conversation_participants" as any)
          .insert([
            { conversation_id: conversation.id, user_id: user?.id },
            { conversation_id: conversation.id, user_id: otherUserId },
          ]);

        if (participantsError) throw participantsError;

        return conversation.id;
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    conversations: conversations || [],
    isLoading,
    createConversation,
  };
};
