import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

// VAPID key from Firebase Console
const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: Replace with actual VAPID key from Firebase Console

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging with support check
const getMessagingInstance = async () => {
  if (messagingInstance) return messagingInstance;
  
  const supported = await isSupported();
  if (!supported) {
    console.warn("[FCM] Firebase messaging not supported in this browser");
    return null;
  }
  
  messagingInstance = getMessaging(app);
  return messagingInstance;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.log("[FCM] Notification permission denied");
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("[FCM] Service worker registered:", registration);

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.substring(0, 20) + "...");
      await saveFCMToken(token);
      return token;
    }

    return null;
  } catch (error) {
    console.error("[FCM] Error getting token:", error);
    return null;
  }
};

// Save FCM token to database
const saveFCMToken = async (token: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Store in user_settings or a dedicated fcm_tokens table
    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        // Store token in a JSON field or create dedicated column
        // For now, using a workaround with existing fields
      }, {
        onConflict: "user_id"
      });

    if (error) {
      console.error("[FCM] Error saving token:", error);
    }
  } catch (error) {
    console.error("[FCM] Error in saveFCMToken:", error);
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  getMessagingInstance().then(messaging => {
    if (!messaging) return;
    
    return onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message received:", payload);
      callback(payload);
    });
  });
};

// Check if notifications are supported
export const isNotificationsSupported = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  
  return await isSupported();
};

// Get current permission status
export const getNotificationPermissionStatus = (): NotificationPermission => {
  return Notification.permission;
};

// Show local notification
export const showLocalNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      ...options,
    });
  }
};

// Notification types
export type NotificationType = 
  | "message"
  | "incoming_call"
  | "missed_call"
  | "friend_request"
  | "friend_accept"
  | "like"
  | "comment"
  | "mention"
  | "admin"
  | "system";

// Create notification payload
export const createNotificationPayload = (
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
) => ({
  notification: { title, body },
  data: { type, ...data },
});
