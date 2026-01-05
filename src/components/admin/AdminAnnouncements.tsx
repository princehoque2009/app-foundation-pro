import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Send,
  AlertTriangle,
  Info,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

type AnnouncementType = "info" | "warning" | "feature" | "urgent";

interface AnnouncementData {
  title: string;
  message: string;
  type: AnnouncementType;
  targetAll: boolean;
  scheduled: boolean;
  scheduleTime?: string;
}

export const AdminAnnouncements = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState<AnnouncementData>({
    title: "",
    message: "",
    type: "info",
    targetAll: true,
    scheduled: false,
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data: AnnouncementData) => {
      // Fetch all user IDs if targeting all
      let userIds: string[] = [];
      if (data.targetAll) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id");
        userIds = users?.map((u) => u.id) || [];
      }

      // Create notifications for all users
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title: data.title,
        message: data.message,
        type: `announcement_${data.type}`,
        from_user_id: user?.id,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "announcement_sent",
        target_type: "system",
        details: { title: data.title, type: data.type, recipients: userIds.length },
      });

      return { sent: userIds.length };
    },
    onSuccess: (result) => {
      toast({
        title: "Announcement Sent",
        description: `Sent to ${result.sent} users successfully`,
      });
      setAnnouncement({
        title: "",
        message: "",
        type: "info",
        targetAll: true,
        scheduled: false,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "feature":
        return <Sparkles className="h-4 w-4" />;
      case "urgent":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: AnnouncementType) => {
    switch (type) {
      case "info":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "warning":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "feature":
        return "bg-purple-500/10 text-purple-600 border-purple-500/30";
      case "urgent":
        return "bg-red-500/10 text-red-600 border-red-500/30";
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          System Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Selection */}
        <div className="flex gap-2 flex-wrap">
          {(["info", "warning", "feature", "urgent"] as AnnouncementType[]).map((type) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAnnouncement((prev) => ({ ...prev, type }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                announcement.type === type
                  ? getTypeColor(type)
                  : "border-border hover:bg-muted/50"
              }`}
            >
              {getTypeIcon(type)}
              <span className="text-sm capitalize">{type}</span>
            </motion.button>
          ))}
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Announcement title..."
            value={announcement.title}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Your announcement message..."
            rows={4}
            value={announcement.message}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, message: e.target.value }))
            }
          />
        </div>

        {/* Options */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Send to all users</span>
          </div>
          <Switch
            checked={announcement.targetAll}
            onCheckedChange={(checked) =>
              setAnnouncement((prev) => ({ ...prev, targetAll: checked }))
            }
          />
        </div>

        {/* Preview */}
        {(announcement.title || announcement.message) && (
          <div className="p-4 rounded-lg border border-dashed border-border">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getTypeColor(announcement.type)}`}>
                {getTypeIcon(announcement.type)}
              </div>
              <div>
                <p className="font-medium text-sm">{announcement.title || "Title"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {announcement.message || "Message content"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          className="w-full"
          onClick={() => sendAnnouncementMutation.mutate(announcement)}
          disabled={
            !announcement.title.trim() ||
            !announcement.message.trim() ||
            sendAnnouncementMutation.isPending
          }
        >
          <Send className="h-4 w-4 mr-2" />
          {sendAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
        </Button>
      </CardContent>
    </Card>
  );
};
