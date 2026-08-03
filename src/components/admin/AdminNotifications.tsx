import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Bell, Send, Users, User, Megaphone, AlertTriangle, Sparkles, Loader2, Smartphone } from "lucide-react";
import { sendPush } from "@/lib/push";

export const AdminNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "selected">("all");
  const [targetUserIds, setTargetUserIds] = useState("");
  const [notificationType, setNotificationType] = useState<"announcement" | "warning" | "feature">("announcement");

  const sendNotification = useMutation({
    mutationFn: async () => {
      let userIds: string[] = [];

      if (targetType === "all") {
        // Get all user IDs
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id");
        userIds = profiles?.map(p => p.id) || [];
      } else {
        // Parse selected user IDs
        userIds = targetUserIds.split(",").map(id => id.trim()).filter(Boolean);
      }

      if (userIds.length === 0) {
        throw new Error("No users to notify");
      }

      // Create notifications for all users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        from_user_id: user?.id,
        type: notificationType,
        title,
        message,
        action_url: null,
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
      }

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "notification_sent",
        target_type: "notification",
        details: { 
          title, 
          message, 
          type: notificationType,
          recipient_count: userIds.length,
          target_type: targetType,
        },
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Notifications Sent", 
        description: `Your ${notificationType} has been sent to ${targetType === "all" ? "all users" : "selected users"}.` 
      });
      setTitle("");
      setMessage("");
      setTargetUserIds("");
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to send notifications.", 
        variant: "destructive" 
      });
    },
  });

  // ---- Push notification form ----
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/notifications");
  const [pushTarget, setPushTarget] = useState<"all" | "selected">("all");
  const [pushUserId, setPushUserId] = useState("");

  const sendPushNotification = useMutation({
    mutationFn: async () => {
      const ids =
        pushTarget === "all"
          ? ("all" as const)
          : pushUserId.split(",").map((id) => id.trim()).filter(Boolean);

      if (ids !== "all" && ids.length === 0) throw new Error("Enter at least one user ID");

      const result = await sendPush({
        user_ids: ids,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        url: pushUrl.trim() || "/notifications",
        type: "admin",
      });

      // Mirror as in-app notifications
      let recipients: string[] = [];
      if (ids === "all") {
        const { data: profiles } = await supabase.from("profiles").select("id");
        recipients = profiles?.map((p) => p.id) || [];
      } else {
        recipients = ids;
      }

      const rows = recipients.map((userId) => ({
        user_id: userId,
        from_user_id: user?.id,
        type: "announcement",
        title: pushTitle.trim(),
        message: pushBody.trim(),
        action_url: pushUrl.trim() || null,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 100));
        if (error) throw error;
      }

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "push_notification_sent",
        target_type: "notification",
        details: { title: pushTitle, body: pushBody, url: pushUrl, target: pushTarget, result },
      });

      return result as { sent?: number; failed?: number } | null;
    },
    onSuccess: (result) => {
      toast({
        title: "Push sent",
        description: `Delivered to ${result?.sent ?? 0} device(s)${result?.failed ? `, ${result.failed} failed` : ""}.`,
      });
      setPushTitle("");
      setPushBody("");
      setPushUserId("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send push notification.",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = () => {
    switch (notificationType) {
      case "announcement": return Megaphone;
      case "warning": return AlertTriangle;
      case "feature": return Sparkles;
      default: return Bell;
    }
  };

  const NotificationIcon = getNotificationIcon();

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Send Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Type */}
          <div className="space-y-3">
            <Label>Notification Type</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setNotificationType("announcement")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  notificationType === "announcement" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Megaphone className={`h-6 w-6 mx-auto mb-2 ${
                  notificationType === "announcement" ? "text-primary" : "text-muted-foreground"
                }`} />
                <p className="text-sm font-medium">Announcement</p>
              </button>
              <button
                onClick={() => setNotificationType("warning")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  notificationType === "warning" 
                    ? "border-yellow-500 bg-yellow-500/5" 
                    : "border-border hover:border-yellow-500/50"
                }`}
              >
                <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${
                  notificationType === "warning" ? "text-yellow-500" : "text-muted-foreground"
                }`} />
                <p className="text-sm font-medium">Warning</p>
              </button>
              <button
                onClick={() => setNotificationType("feature")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  notificationType === "feature" 
                    ? "border-purple-500 bg-purple-500/5" 
                    : "border-border hover:border-purple-500/50"
                }`}
              >
                <Sparkles className={`h-6 w-6 mx-auto mb-2 ${
                  notificationType === "feature" ? "text-purple-500" : "text-muted-foreground"
                }`} />
                <p className="text-sm font-medium">Feature</p>
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-3">
            <Label>Target Audience</Label>
            <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as "all" | "selected")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  All Users
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Selected Users
                </Label>
              </div>
            </RadioGroup>

            {targetType === "selected" && (
              <Input
                placeholder="Enter user IDs separated by commas"
                value={targetUserIds}
                onChange={(e) => setTargetUserIds(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Write your notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-xl p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    notificationType === "warning" 
                      ? "bg-yellow-500/10" 
                      : notificationType === "feature"
                        ? "bg-purple-500/10"
                        : "bg-primary/10"
                  }`}>
                    <NotificationIcon className={`h-5 w-5 ${
                      notificationType === "warning" 
                        ? "text-yellow-500" 
                        : notificationType === "feature"
                          ? "text-purple-500"
                          : "text-primary"
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold">{title || "Notification Title"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {message || "Your notification message will appear here..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => sendNotification.mutate()}
            disabled={sendNotification.isPending || !title.trim() || !message.trim()}
          >
            {sendNotification.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            Send Notification
          </Button>
        </CardContent>
      </Card>

      {/* Push Notification */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Send Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Push title"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              placeholder="Push message body..."
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              className="min-h-[90px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Target URL</Label>
            <Input
              placeholder="/notifications"
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Recipients</Label>
            <RadioGroup value={pushTarget} onValueChange={(v) => setPushTarget(v as "all" | "selected")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="push-all" />
                <Label htmlFor="push-all" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Broadcast to all
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="push-selected" />
                <Label htmlFor="push-selected" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Specific user IDs
                </Label>
              </div>
            </RadioGroup>

            {pushTarget === "selected" && (
              <Input
                placeholder="Enter user IDs separated by commas"
                value={pushUserId}
                onChange={(e) => setPushUserId(e.target.value)}
              />
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => sendPushNotification.mutate()}
            disabled={sendPushNotification.isPending || !pushTitle.trim() || !pushBody.trim()}
          >
            {sendPushNotification.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Smartphone className="h-5 w-5 mr-2" />
            )}
            Send Push Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
