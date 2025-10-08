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
        const { data, error }: any = await supabase
          .from("conversation_participants" as any)
          .select(`
            conversation_id,
            conversations (
              id,
              created_at,
              updated_at
            )
          `)
          .eq("user_id", user?.id);

        if (error) throw error;
        if (!data) return [];

        // Get the other participant for each conversation
        const conversationsWithUsers = await Promise.all(
          data.map(async (item: any) => {
            try {
              const { data: participants, error: participantsError }: any = await supabase
                .from("conversation_participants" as any)
                .select("user_id, profiles (*)")
                .eq("conversation_id", item.conversation_id)
                .neq("user_id", user?.id)
                .maybeSingle();

              if (participantsError) throw participantsError;

              // Get last message
              const { data: lastMessage }: any = await supabase
                .from("messages" as any)
                .select("*")
                .eq("conversation_id", item.conversation_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              return {
                ...(item.conversations || {}),
                otherUser: participants?.profiles || null,
                lastMessage: lastMessage || null,
              };
            } catch (error) {
              console.error("Error fetching conversation details:", error);
              return null;
            }
          })
        );

        return conversationsWithUsers.filter(Boolean);
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
