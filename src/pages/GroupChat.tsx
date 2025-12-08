import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Image,
  Mic,
  MoreVertical,
  Users,
  Settings,
  UserPlus,
  LogOut,
  Trash2,
  Crown,
  UserCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

// TODO: Integrate with Firebase for real-time group messages
// This is a UI-only implementation

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
}

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);

  // Fetch group details
  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch group members
  const { data: members } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_group_members")
        .select(`
          role,
          user_id,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("group_id", groupId);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const currentMember = members?.find((m: any) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";

  // Leave group mutation
  const leaveGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast({ title: "Left group" });
      navigate("/groups");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete group mutation (admin only)
  const deleteGroup = useMutation({
    mutationFn: async () => {
      // Delete all members first
      await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId);

      // Delete group
      const { error } = await supabase
        .from("chat_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast({ title: "Group deleted" });
      navigate("/groups");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // TODO: Load messages from Firebase
  useEffect(() => {
    // Demo messages for UI preview
    setMessages([
      {
        id: "1",
        senderId: "demo1",
        senderName: "John",
        text: "Hey everyone! Welcome to the group 👋",
        timestamp: Date.now() - 3600000,
      },
      {
        id: "2",
        senderId: user?.id || "",
        senderName: "You",
        text: "Thanks for adding me!",
        timestamp: Date.now() - 1800000,
      },
    ]);
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;

    // TODO: Send to Firebase
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || "",
      senderName: "You",
      text: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MainLayout showBottomNav={false}>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={group?.avatar_url || ""} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                    {group?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <h3 className="font-semibold truncate">{group?.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {members?.length || 0} members
                  </p>
                </div>
              </button>
            </SheetTrigger>

            <SheetContent className="w-[340px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Group Info</SheetTitle>
              </SheetHeader>

              <div className="py-6 space-y-6">
                {/* Group Avatar & Name */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 rounded-2xl mb-3">
                    <AvatarImage src={group?.avatar_url || ""} />
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-2xl">
                      {group?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="font-semibold text-lg">{group?.name}</h2>
                  {group?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Members */}
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">
                    Members ({members?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {members?.map((member: any) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profiles?.avatar_url || ""} />
                          <AvatarFallback>
                            <UserCircle className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">
                              {member.profiles?.display_name || member.profiles?.username}
                            </span>
                            {member.profiles?.is_verified && <VerifiedBadge size="sm" />}
                            {member.role === "admin" && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{member.profiles?.username}
                          </p>
                        </div>
                        {member.user_id === user?.id && (
                          <Badge variant="secondary" className="text-[10px]">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                  {isAdmin && (
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add Members
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to leave this group?")) {
                        leaveGroup.mutate();
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Leave Group
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
                          deleteGroup.mutate();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Group
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setInfoOpen(true)}>
                <Info className="h-4 w-4 mr-2" />
                Group Info
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Group Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => {
                const isOwn = message.senderId === user?.id;
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
                  >
                    {!isOwn && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderAvatar || ""} />
                        <AvatarFallback className="text-xs">
                          {message.senderName[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("max-w-[70%]", isOwn && "order-1")}>
                      {!isOwn && (
                        <p className="text-xs text-muted-foreground mb-1 ml-1">
                          {message.senderName}
                        </p>
                      )}
                      <div
                        className={cn(
                          "p-3 rounded-2xl",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        <p className="text-sm break-words">{message.text}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1 text-right",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Image className="h-5 w-5" />
            </Button>
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-muted border-0 rounded-full"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!messageText.trim()}
              className="rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GroupChat;
