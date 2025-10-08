import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: selectedConversation } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error }: any = await supabase
          .from("conversation_participants" as any)
          .select("profiles (*)")
          .eq("conversation_id", selectedConversationId)
          .neq("user_id", userData.user.id)
          .maybeSingle();

        if (error) throw error;
        return data?.profiles || null;
      } catch (error) {
        console.error("Error fetching conversation:", error);
        return null;
      }
    },
    enabled: !!selectedConversationId,
  });

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full border rounded-lg overflow-hidden bg-card">
          {/* Conversations List */}
          <div className="border-r">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Messages</h2>
            </div>
            <ConversationList
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
            />
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2">
            {selectedConversationId && selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversationId}
                otherUser={selectedConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
