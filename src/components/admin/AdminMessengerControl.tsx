import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Users,
  Mic,
  Phone,
  Mail,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export const AdminMessengerControl = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch app settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");
      if (error) throw error;
      return data as AppSetting[];
    },
  });

  // Update setting mutation
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          setting_value: String(value),
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq("setting_key", key);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `setting_${key}_${value ? 'enabled' : 'disabled'}`,
        target_type: "setting",
        details: { key, value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getSetting = (key: string): boolean => {
    const setting = settings?.find((s) => s.setting_key === key);
    return setting?.setting_value === "true";
  };

  const messengerSettings = [
    {
      key: "messaging_enabled",
      label: "Enable Messaging",
      description: "Allow users to send direct messages",
      icon: MessageSquare,
    },
    {
      key: "group_chats_enabled",
      label: "Enable Group Chats",
      description: "Allow users to create and join group chats",
      icon: Users,
    },
    {
      key: "voice_messages_enabled",
      label: "Enable Voice Messages",
      description: "Allow users to send voice messages",
      icon: Mic,
    },
    {
      key: "calls_enabled",
      label: "Enable Calls",
      description: "Allow voice and video calls",
      icon: Phone,
    },
    {
      key: "message_requests_enabled",
      label: "Enable Message Requests",
      description: "Allow message requests from non-friends",
      icon: Mail,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Messenger Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Global Messenger Controls
          </CardTitle>
          <CardDescription>
            These settings affect all users across the platform. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {messengerSettings.map((setting, index) => (
            <div key={setting.key}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <setting.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">{setting.label}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Switch
                  checked={getSetting(setting.key)}
                  onCheckedChange={(checked) => 
                    updateSetting.mutate({ key: setting.key, value: checked })
                  }
                />
              </div>
              {index < messengerSettings.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Impact Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-600 dark:text-amber-400">
                User Settings Impact
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                When you disable a feature globally, users will see "Disabled by Admin" in their
                settings and won't be able to change it. Re-enabling the feature will restore
                user control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {messengerSettings.map((setting) => (
              <div
                key={setting.key}
                className="p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{setting.label.replace("Enable ", "")}</span>
                  <Badge variant={getSetting(setting.key) ? "default" : "secondary"}>
                    {getSetting(setting.key) ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
