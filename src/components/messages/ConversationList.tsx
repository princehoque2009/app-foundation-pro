import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationList = ({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) => {
  const { conversations, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start a chat with your friends
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "w-full p-3 rounded-lg hover:bg-accent transition-colors text-left",
              selectedConversationId === conversation.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={conversation.otherUser?.avatar_url || ""} />
                <AvatarFallback>
                  <UserCircle className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {conversation.otherUser?.display_name ||
                    conversation.otherUser?.username}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage?.content || "No messages yet"}
                </p>
              </div>
              {conversation.lastMessage && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
