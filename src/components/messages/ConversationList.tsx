import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCircle, Search, MessageSquare, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationList = ({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) => {
  const { conversations, isLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");

  // Sort conversations: unread first, then by latest message time
  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    
    return [...conversations].sort((a, b) => {
      // Prioritize unread messages
      const aHasUnread = a.unreadCount && a.unreadCount > 0;
      const bHasUnread = b.unreadCount && b.unreadCount > 0;
      
      if (aHasUnread && !bHasUnread) return -1;
      if (!aHasUnread && bHasUnread) return 1;
      
      // Then sort by latest message time
      const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  // Filter by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return sortedConversations;
    
    const query = searchQuery.toLowerCase();
    return sortedConversations.filter((conv) => {
      const name = conv.otherUser?.display_name || conv.otherUser?.username || "";
      return name.toLowerCase().includes(query);
    });
  }, [sortedConversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start a chat with your friends
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-border/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <AnimatePresence mode="popLayout">
            {filteredConversations.map((conversation) => {
              const hasUnread = conversation.unreadCount && conversation.unreadCount > 0;
              const isPinned = conversation.isPinned;
              
              return (
                <motion.button
                  key={conversation.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "w-full p-3 rounded-xl transition-all text-left",
                    "hover:bg-accent/50",
                    selectedConversationId === conversation.id && "bg-accent",
                    hasUnread && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <Avatar className={cn(
                        "h-12 w-12 ring-2 ring-transparent",
                        hasUnread && "ring-primary"
                      )}>
                        <AvatarImage src={conversation.otherUser?.avatar_url || ""} />
                        <AvatarFallback className="bg-muted">
                          <UserCircle className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      {conversation.otherUser?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate text-sm",
                            hasUnread && "font-bold text-foreground"
                          )}>
                            {conversation.otherUser?.display_name || conversation.otherUser?.username}
                          </h3>
                          {isPinned && (
                            <Pin className="h-3 w-3 text-primary shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {conversation.lastMessage && (
                            <span className={cn(
                              "text-xs",
                              hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                                addSuffix: false,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn(
                          "text-sm truncate",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conversation.lastMessage?.content || "No messages yet"}
                        </p>
                        
                        {hasUnread && (
                          <Badge 
                            variant="default" 
                            className="h-5 min-w-[20px] px-1.5 text-xs font-bold shrink-0"
                          >
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {filteredConversations.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No conversations found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};