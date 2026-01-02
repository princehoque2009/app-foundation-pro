import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Settings,
  Key,
  Calendar,
  Phone,
  AlertTriangle,
  Construction,
  Shield,
  Lock,
} from "lucide-react";

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export const AdminAppSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [minAge, setMinAge] = useState("13");

  // Fetch app settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");
      if (error) throw error;
      
      // Set initial min age from settings
      const ageSetting = data?.find((s: any) => s.setting_key === "min_age_required");
      if (ageSetting) setMinAge(String(ageSetting.setting_value));
      
      return data;
    },
  });

  // Update setting mutation
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq("setting_key", key);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `setting_${key}_updated`,
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

  const getSetting = (key: string): string => {
    const setting = settings?.find((s: any) => s.setting_key === key);
    return String(setting?.setting_value || "");
  };

  const getSettingBool = (key: string): boolean => {
    return getSetting(key) === "true";
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
      {/* Maintenance Mode */}
      <Card className={getSettingBool("maintenance_mode") ? "border-orange-500 bg-orange-500/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-orange-500" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            When enabled, only admins can access the app. Users will see a maintenance page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                {getSettingBool("maintenance_mode") ? "App is currently in maintenance" : "App is running normally"}
              </p>
            </div>
            <Switch
              checked={getSettingBool("maintenance_mode")}
              onCheckedChange={(checked) => 
                updateSetting.mutate({ key: "maintenance_mode", value: String(checked) })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication Settings
          </CardTitle>
          <CardDescription>
            Control how users can sign in and manage their accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <Label className="text-base font-medium">Phone Login</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in with phone number + OTP
                </p>
              </div>
            </div>
            <Switch
              checked={getSettingBool("phone_login_enabled")}
              onCheckedChange={(checked) => 
                updateSetting.mutate({ key: "phone_login_enabled", value: String(checked) })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <Label className="text-base font-medium">Require Date of Birth</Label>
                <p className="text-sm text-muted-foreground">
                  Users must provide DOB during signup
                </p>
              </div>
            </div>
            <Switch
              checked={getSettingBool("require_dob")}
              onCheckedChange={(checked) => 
                updateSetting.mutate({ key: "require_dob", value: String(checked) })
              }
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <Label className="text-base font-medium">Minimum Age Requirement</Label>
                <p className="text-sm text-muted-foreground">
                  Users under this age cannot create accounts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-12">
              <Input
                type="number"
                min="13"
                max="21"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">years old</span>
              <Button
                size="sm"
                onClick={() => updateSetting.mutate({ key: "min_age_required", value: minAge })}
                disabled={minAge === getSetting("min_age_required")}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Global privacy controls that affect user settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Admin Override Rules</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>When you disable a feature, it's disabled for ALL users</li>
                  <li>Users will see "Disabled by Admin" in their settings</li>
                  <li>User preferences are preserved but inactive until re-enabled</li>
                  <li>All admin actions are logged for security</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground">Maintenance</span>
              <div className="mt-1">
                <Badge variant={getSettingBool("maintenance_mode") ? "destructive" : "default"}>
                  {getSettingBool("maintenance_mode") ? "ON" : "OFF"}
                </Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground">Phone Login</span>
              <div className="mt-1">
                <Badge variant={getSettingBool("phone_login_enabled") ? "default" : "secondary"}>
                  {getSettingBool("phone_login_enabled") ? "ON" : "OFF"}
                </Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground">DOB Required</span>
              <div className="mt-1">
                <Badge variant={getSettingBool("require_dob") ? "default" : "secondary"}>
                  {getSettingBool("require_dob") ? "YES" : "NO"}
                </Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground">Min Age</span>
              <div className="mt-1">
                <Badge variant="outline">{getSetting("min_age_required")}+</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
