import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Eye, 
  Bell, 
  UserCircle, 
  AtSign, 
  Settings, 
  Send,
  CheckCircle,
  Trash2,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const getIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="h-4 w-4 text-pink-500" />;
    case 'comment':
    case 'comment_reply':
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case 'friend_request':
    case 'friend_accept':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'story_view':
      return <Eye className="h-4 w-4 text-purple-500" />;
    case 'mention':
      return <AtSign className="h-4 w-4 text-amber-500" />;
    case 'message':
    case 'support_response':
      return <Send className="h-4 w-4 text-primary" />;
    case 'advisor_suggestion':
    case 'advisor_guidance':
    case 'advisor_feedback':
      return <Star className="h-4 w-4 text-amber-500" />;
    case 'system_warning':
      return <Settings className="h-4 w-4 text-amber-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getCategory = (type: string): "social" | "messages" | "system" => {
  switch (type) {
    case 'like':
    case 'comment':
    case 'comment_reply':
    case 'friend_request':
    case 'friend_accept':
    case 'story_view':
    case 'mention':
      return "social";
    case 'message':
    case 'support_response':
      return "messages";
    default:
      return "system";
  }
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

  // Group notifications by category
  const socialNotifications = notifications.filter(n => getCategory(n.type) === "social");
  const messageNotifications = notifications.filter(n => getCategory(n.type) === "messages");
  const systemNotifications = notifications.filter(n => getCategory(n.type) === "system");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const NotificationItem = ({ notification }: { notification: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all hover-lift",
          !notification.is_read && "bg-accent/50 border-primary/20"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={notification.from_user?.avatar_url} />
              <AvatarFallback>
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border-2 border-background">
              {getIcon(notification.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm mb-1",
              !notification.is_read && "font-semibold"
            )}>
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0 mt-2" />
          )}
        </div>
      </Card>
    </motion.div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-2">
              {unreadCount} unread
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No notifications yet</h3>
          <p className="text-sm text-muted-foreground">
            When someone interacts with your posts or sends you a friend request, you'll see it here
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px]">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1">
              Social
              {socialNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px]">
                  {socialNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1">
              Messages
              {messageNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px]">
                  {messageNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="system" className="flex-1">
              System
              {systemNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px]">
                  {systemNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="social">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {socialNotifications.length === 0 ? (
                  <EmptyState message="No social notifications" />
                ) : (
                  <AnimatePresence>
                    {socialNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {messageNotifications.length === 0 ? (
                  <EmptyState message="No message notifications" />
                ) : (
                  <AnimatePresence>
                    {messageNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {systemNotifications.length === 0 ? (
                  <EmptyState message="No system notifications" />
                ) : (
                  <AnimatePresence>
                    {systemNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};