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
  MessageSquare, Camera, Search, Bell, Edit3, PenTool, Shield, AlertTriangle, Settings,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  icon: any;
}

const FEATURES: FeatureToggle[] = [
  { key: "messaging_enabled", label: "Messenger / Chat", description: "Direct messaging and group chats", icon: MessageSquare },
  { key: "stories_enabled", label: "Stories", description: "Story creation and viewing", icon: Camera },
  { key: "explore_enabled", label: "Explore / Search", description: "Explore page and search functionality", icon: Search },
  { key: "notifications_enabled", label: "Notifications", description: "Push and in-app notifications", icon: Bell },
  { key: "profile_editing_enabled", label: "Profile Editing", description: "Users can edit their profiles", icon: Edit3 },
  { key: "posting_enabled", label: "Posting", description: "Creating new posts and reels", icon: PenTool },
  { key: "calls_enabled", label: "Voice & Video Calls", description: "Audio and video calling features", icon: MessageSquare },
  { key: "maintenance_mode", label: "Maintenance Mode", description: "Put the entire app into maintenance", icon: Settings },
];

export const AdminFeatureControls = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{ key: string; label: string; newValue: boolean } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({
          setting_value: String(value),
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("setting_key", key);
      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `feature_${key}_${value ? "enabled" : "disabled"}`,
        target_type: "setting",
        details: { key, value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: "Feature updated", description: "Changes take effect immediately for all users." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getSetting = (key: string): boolean => {
    const setting = settings?.find((s: any) => s.setting_key === key);
    if (!setting) return key === "maintenance_mode" ? false : true;
    return setting.setting_value === "true" || setting.setting_value === true;
  };

  const handleToggle = (key: string, label: string, currentValue: boolean) => {
    const newValue = !currentValue;
    // For disabling features or enabling maintenance, show confirmation
    const isDisabling = key === "maintenance_mode" ? newValue : !newValue;
    if (isDisabling) {
      setConfirmDialog({ key, label, newValue });
    } else {
      updateSetting.mutate({ key, value: newValue });
    }
  };

  const confirmToggle = () => {
    if (confirmDialog) {
      updateSetting.mutate({ key: confirmDialog.key, value: confirmDialog.newValue });
      setConfirmDialog(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            System Feature Controls
          </CardTitle>
          <CardDescription>
            Toggle features on or off globally. Changes take effect immediately for all users.
            Disabled features show a maintenance page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FEATURES.map((feature, index) => {
            const isEnabled = getSetting(feature.key);
            const isMaintenanceMode = feature.key === "maintenance_mode";
            const displayEnabled = isMaintenanceMode ? isEnabled : isEnabled;

            return (
              <div key={feature.key}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${displayEnabled && !isMaintenanceMode ? "bg-green-500/10" : isMaintenanceMode && isEnabled ? "bg-destructive/10" : "bg-muted"}`}>
                      <feature.icon className={`h-5 w-5 ${displayEnabled && !isMaintenanceMode ? "text-green-600" : isMaintenanceMode && isEnabled ? "text-destructive" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <Label className="text-base font-medium">{feature.label}</Label>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={displayEnabled && !isMaintenanceMode ? "default" : isMaintenanceMode && isEnabled ? "destructive" : "secondary"} className="text-xs">
                      {isMaintenanceMode ? (isEnabled ? "ACTIVE" : "OFF") : (isEnabled ? "ON" : "OFF")}
                    </Badge>
                    <Switch
                      checked={isMaintenanceMode ? isEnabled : isEnabled}
                      onCheckedChange={() => handleToggle(feature.key, feature.label, isMaintenanceMode ? isEnabled : isEnabled)}
                    />
                  </div>
                </div>
                {index < FEATURES.length - 1 && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-600 dark:text-amber-400">Real-time Impact</h4>
              <p className="text-sm text-muted-foreground mt-1">
                When you disable a feature, all users will immediately see a "Feature under maintenance" 
                message when trying to access it. Re-enabling restores access instantly. 
                These changes are synced in real-time via Supabase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.key === "maintenance_mode" 
                ? "Enable Maintenance Mode?" 
                : `Disable ${confirmDialog?.label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.key === "maintenance_mode"
                ? "This will block all non-admin users from accessing the app. Are you sure?"
                : `This will immediately prevent all users from accessing ${confirmDialog?.label}. They will see a maintenance message instead.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};