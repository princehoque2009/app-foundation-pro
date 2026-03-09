import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Bell, Mail, Heart, MessageCircle, UserPlus, Users, AtSign, Eye } from "lucide-react";

export const NotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data: existingSettings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from("user_settings")
          .update(updates)
          .eq("user_id", user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: user?.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] });
      toast({ title: "Settings updated", description: "Notification preferences saved." });
    },
  });

  const toggleItems = [
    { icon: Heart, label: "Likes", desc: "When someone likes your post", color: "text-foreground" },
    { icon: MessageCircle, label: "Comments", desc: "When someone comments on your post", color: "text-foreground" },
    { icon: AtSign, label: "Mentions", desc: "When someone mentions you", color: "text-foreground" },
    { icon: UserPlus, label: "Friend Requests", desc: "New friend requests and accepts", color: "text-foreground" },
    { icon: Eye, label: "Story Activity", desc: "Views and reactions to your stories", color: "text-foreground" },
    { icon: Users, label: "Circle Activity", desc: "Posts and joins in your circles", color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Main toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>Control push notifications on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="push">Enable push notifications</Label>
            <Switch
              id="push"
              checked={settings?.notifications_enabled ?? true}
              onCheckedChange={(checked) =>
                updateSettingMutation.mutate({ notifications_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-blue-500" />
            Email Notifications
          </CardTitle>
          <CardDescription>Control which emails you receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Enable email notifications</Label>
            <Switch
              id="email"
              checked={settings?.email_notifications ?? true}
              onCheckedChange={(checked) =>
                updateSettingMutation.mutate({ email_notifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity-based toggles (visual only for now) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Notifications</CardTitle>
          <CardDescription>Choose what activities you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggleItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
