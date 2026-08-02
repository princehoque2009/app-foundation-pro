import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Shield, Lock, Eye } from "lucide-react";

export const PrivacySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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




  const update2FAMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: existingSettings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from("user_settings")
          .update({ two_factor_enabled: enabled })
          .eq("user_id", user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: user?.id, two_factor_enabled: enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", user?.id] });
      toast({
        title: "2FA settings updated",
        description: "Two-factor authentication settings have been updated.",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Account Type
          </CardTitle>
          <CardDescription>
            All Prangon accounts are public
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Anyone can see your posts and follow you instantly — no approval needed.
          </p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="2fa">Enable 2FA</Label>
            <Switch
              id="2fa"
              checked={settings?.two_factor_enabled || false}
              onCheckedChange={(checked) => update2FAMutation.mutate(checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
