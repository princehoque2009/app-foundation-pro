import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { toast } from "@/hooks/use-toast";

export interface MessengerSettings {
  // Appearance
  theme: "default" | "dark" | "light" | "blue" | "purple" | "green";
  bubbleStyle: "rounded" | "sharp" | "minimal";
  fontSize: "small" | "medium" | "large";
  chatBackground: string | null;
  
  // Privacy
  readReceipts: boolean;
  typingIndicator: boolean;
  messageRequests: "everyone" | "friends" | "none";
  
  // Notifications
  messageAlerts: boolean;
  groupMentions: boolean;
  reactionAlerts: boolean;
  mutedChats: string[];
  
  // Behavior
  enterToSend: boolean;
  autoScroll: boolean;
  saveDrafts: boolean;
  
  // Media
  autoDownloadMedia: boolean;
  mediaQuality: "low" | "medium" | "high";
}

interface AdminOverrides {
  messaging_enabled: boolean;
  group_chats_enabled: boolean;
  voice_messages_enabled: boolean;
  calls_enabled: boolean;
  message_requests_enabled: boolean;
}

const DEFAULT_SETTINGS: MessengerSettings = {
  theme: "default",
  bubbleStyle: "rounded",
  fontSize: "medium",
  chatBackground: null,
  readReceipts: true,
  typingIndicator: true,
  messageRequests: "everyone",
  messageAlerts: true,
  groupMentions: true,
  reactionAlerts: true,
  mutedChats: [],
  enterToSend: true,
  autoScroll: true,
  saveDrafts: true,
  autoDownloadMedia: true,
  mediaQuality: "high",
};

export const useMessengerSettings = () => {
  const { user } = useAuth();
  const { settings: appSettings, isFeatureEnabled } = useAppSettings();
  const storageKey = user?.id ? `messenger_settings_${user.id}` : null;
  
  const [settings, setSettings] = useState<MessengerSettings>(() => {
    if (typeof window === "undefined" || !storageKey) return DEFAULT_SETTINGS;
    
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Admin overrides from app settings
  const adminOverrides: AdminOverrides = {
    messaging_enabled: isFeatureEnabled("messaging_enabled"),
    group_chats_enabled: isFeatureEnabled("group_chats_enabled"),
    voice_messages_enabled: isFeatureEnabled("voice_messages_enabled"),
    calls_enabled: isFeatureEnabled("calls_enabled"),
    message_requests_enabled: isFeatureEnabled("message_requests_enabled"),
  };
  
  // Load settings when user changes
  useEffect(() => {
    if (!storageKey) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {
      // Use defaults
    }
  }, [storageKey]);
  
  const updateSettings = useCallback((updates: Partial<MessengerSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(newSettings));
      }
      
      // Show immediate feedback
      toast({
        title: "Setting updated",
        description: "Your preference has been saved.",
      });
      
      return newSettings;
    });
  }, [storageKey]);
  
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    toast({
      title: "Settings reset",
      description: "All messenger settings have been reset to defaults.",
    });
  }, [storageKey]);
  
  const muteChat = useCallback((chatId: string) => {
    updateSettings({
      mutedChats: [...settings.mutedChats.filter(id => id !== chatId), chatId]
    });
  }, [settings.mutedChats, updateSettings]);
  
  const unmuteChat = useCallback((chatId: string) => {
    updateSettings({
      mutedChats: settings.mutedChats.filter(id => id !== chatId)
    });
  }, [settings.mutedChats, updateSettings]);
  
  const isChatMuted = useCallback((chatId: string) => {
    return settings.mutedChats.includes(chatId);
  }, [settings.mutedChats]);

  // Check if a feature is disabled by admin
  const isDisabledByAdmin = useCallback((feature: keyof AdminOverrides): boolean => {
    return !adminOverrides[feature];
  }, [adminOverrides]);

  // Get effective value considering admin overrides
  const getEffectiveValue = useCallback(<K extends keyof MessengerSettings>(
    key: K,
    adminFeature?: keyof AdminOverrides
  ): MessengerSettings[K] | null => {
    if (adminFeature && isDisabledByAdmin(adminFeature)) {
      return null; // Feature is disabled by admin
    }
    return settings[key];
  }, [settings, isDisabledByAdmin]);
  
  return {
    settings,
    adminOverrides,
    updateSettings,
    resetSettings,
    muteChat,
    unmuteChat,
    isChatMuted,
    isDisabledByAdmin,
    getEffectiveValue,
  };
};
