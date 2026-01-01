import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  
  const updateSettings = (updates: Partial<MessengerSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(newSettings));
      }
      return newSettings;
    });
  };
  
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };
  
  const muteChat = (chatId: string) => {
    updateSettings({
      mutedChats: [...settings.mutedChats.filter(id => id !== chatId), chatId]
    });
  };
  
  const unmuteChat = (chatId: string) => {
    updateSettings({
      mutedChats: settings.mutedChats.filter(id => id !== chatId)
    });
  };
  
  const isChatMuted = (chatId: string) => settings.mutedChats.includes(chatId);
  
  return {
    settings,
    updateSettings,
    resetSettings,
    muteChat,
    unmuteChat,
    isChatMuted,
  };
};
