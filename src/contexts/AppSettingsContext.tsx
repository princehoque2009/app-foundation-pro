import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AppSettings {
  maintenance_mode: boolean;
  messaging_enabled: boolean;
  group_chats_enabled: boolean;
  voice_messages_enabled: boolean;
  calls_enabled: boolean;
  message_requests_enabled: boolean;
  phone_login_enabled: boolean;
  require_dob: boolean;
  min_age_required: number;
}

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refetch: () => Promise<void>;
  isFeatureEnabled: (feature: keyof AppSettings) => boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  maintenance_mode: false,
  messaging_enabled: true,
  group_chats_enabled: true,
  voice_messages_enabled: true,
  calls_enabled: true,
  message_requests_enabled: true,
  phone_login_enabled: true,
  require_dob: true,
  min_age_required: 13,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value");

      if (error) {
        console.error("Error fetching app settings:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const newSettings: AppSettings = { ...DEFAULT_SETTINGS };
        
        data.forEach((setting) => {
          const key = setting.setting_key as keyof AppSettings;
          const value = setting.setting_value;
          
          if (key in newSettings) {
            if (typeof DEFAULT_SETTINGS[key] === "boolean") {
              (newSettings[key] as boolean) = value === true || value === "true";
            } else if (typeof DEFAULT_SETTINGS[key] === "number") {
              (newSettings[key] as number) = typeof value === "number" ? value : parseInt(String(value), 10) || DEFAULT_SETTINGS[key] as number;
            }
          }
        });
        
        setSettings(newSettings);
      }
    } catch (err) {
      console.error("Failed to fetch app settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, []);

  // Real-time subscription for immediate updates
  useEffect(() => {
    const channel = supabase
      .channel("app-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          console.log("App settings changed:", payload);
          // Immediately refetch to ensure consistency
          fetchSettings();
          
          // Show toast for important changes
          if (payload.new && typeof payload.new === "object" && "setting_key" in payload.new) {
            const key = payload.new.setting_key;
            if (key === "maintenance_mode") {
              const isEnabled = payload.new.setting_value === true || payload.new.setting_value === "true";
              if (isEnabled) {
                toast({
                  title: "Maintenance Mode Activated",
                  description: "The app is now in maintenance mode.",
                  variant: "destructive",
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isFeatureEnabled = (feature: keyof AppSettings): boolean => {
    const value = settings[feature];
    return typeof value === "boolean" ? value : true;
  };

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        loading,
        refetch: fetchSettings,
        isFeatureEnabled,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    // Return safe defaults if used outside provider
    return {
      settings: DEFAULT_SETTINGS,
      loading: false,
      refetch: async () => {},
      isFeatureEnabled: () => true,
    };
  }
  return context;
};
