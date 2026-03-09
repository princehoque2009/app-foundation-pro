import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Heart, MessageCircle, UserPlus, Eye, Bell, UserCircle, AtSign, Settings, Send,
  CheckCircle, Star, Users, Megaphone, ThumbsUp, Reply,
} from "lucide-react";
import { formatDistanceToNow, isToday, isThisWeek } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const getIcon = (type: string) => {
  switch (type) {
    case "like":
      return <Heart className="h-4 w-4 text-pink-500" />;
    case "comment":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "comment_reply":
      return <Reply className="h-4 w-4 text-blue-400" />;
    case "friend_request":
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case "friend_accept":
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case "story_view":
    case "story_reaction":
      return <Eye className="h-4 w-4 text-purple-500" />;
    case "mention":
      return <AtSign className="h-4 w-4 text-amber-500" />;
    case "message":
    case "support_response":
      return <Send className="h-4 w-4 text-primary" />;
    case "circle_join":
    case "circle_post":
      return <Users className="h-4 w-4 text-indigo-500" />;
    case "advisor_suggestion":
    case "advisor_guidance":
    case "advisor_feedback":
      return <Star className="h-4 w-4 text-amber-500" />;
    case "system_warning":
      return <Settings className="h-4 w-4 text-amber-500" />;
    case "reaction":
      return <ThumbsUp className="h-4 w-4 text-pink-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getCategory = (type: string): "social" | "messages" | "system" => {
  switch (type) {
    case "like":
    case "comment":
    case "comment_reply":
    case "friend_request":
    case "friend_accept":
    case "story_view":
    case "story_reaction":
    case "mention":
    case "reaction":
    case "circle_join":
    case "circle_post":
      return "social";
    case "message":
    case "support_response":
      return "messages";
    default:
      return "system";
  }
};

type TimeGroup = "today" | "this_week" | "earlier";

const getTimeGroup = (dateStr: string): TimeGroup => {
  const date = new Date(dateStr);
  if (isToday(date)) return "today";
  if (isThisWeek(date)) return "this_week";
  return "earlier";
};

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: "Today",
  this_week: "This Week",
  earlier: "Earlier",
};

export const NotificationsList = () => {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    markAsRead.mutate(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const socialNotifications = notifications.filter((n) => getCategory(n.type) === "social");
  const messageNotifications = notifications.filter((n) => getCategory(n.type) === "messages");
  const systemNotifications = notifications.filter((n) => getCategory(n.type) === "system");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
            <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const NotificationItem = ({ notification }: { notification: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        className={cn(
          "w-full flex items-start gap-3 p-3.5 rounded-2xl transition-all text-left hover:bg-muted/40",
          !notification.is_read && "bg-primary/5"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={notification.from_user?.avatar_url} />
            <AvatarFallback className="bg-muted">
              <UserCircle className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 border-2 border-background">
            {getIcon(notification.type)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-snug",
              !notification.is_read ? "font-semibold text-foreground" : "text-foreground/80"
            )}
          >
            <span className="font-bold">
              {notification.from_user?.display_name || notification.from_user?.username || "Someone"}
            </span>{" "}
            <span className="font-normal text-muted-foreground">
              {notification.message}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-2" />
        )}
      </button>
    </motion.div>
  );

  const GroupedNotifications = ({ items }: { items: any[] }) => {
    const groups: Record<TimeGroup, any[]> = { today: [], this_week: [], earlier: [] };
    items.forEach((n) => {
      groups[getTimeGroup(n.created_at)].push(n);
    });

    return (
      <div className="space-y-1">
        {(["today", "this_week", "earlier"] as TimeGroup[]).map(
          (group) =>
            groups[group].length > 0 && (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3.5 py-2 mt-2">
                  {TIME_GROUP_LABELS[group]}
                </p>
                <AnimatePresence>
                  {groups[group].map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </AnimatePresence>
              </div>
            )
        )}
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Bell className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header actions */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <Badge variant="default" className="px-2.5 py-0.5 rounded-full text-xs">
            {unreadCount} unread
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-xs text-primary"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <Bell className="h-9 w-9 text-muted-foreground/40" />
          </div>
          <h3 className="font-semibold mb-1 text-foreground">No notifications yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            When someone interacts with your posts or sends you a request, you'll see it here
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl">
            <TabsTrigger value="all" className="text-xs rounded-lg">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] text-[10px] px-1">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs rounded-lg">
              Social
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs rounded-lg">
              Chats
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs rounded-lg">
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-2">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <GroupedNotifications items={notifications} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="social" className="mt-2">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              {socialNotifications.length === 0 ? (
                <EmptyState message="No social notifications" />
              ) : (
                <GroupedNotifications items={socialNotifications} />
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="mt-2">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              {messageNotifications.length === 0 ? (
                <EmptyState message="No message notifications" />
              ) : (
                <GroupedNotifications items={messageNotifications} />
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system" className="mt-2">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              {systemNotifications.length === 0 ? (
                <EmptyState message="No system notifications" />
              ) : (
                <GroupedNotifications items={systemNotifications} />
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
