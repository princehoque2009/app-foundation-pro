import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BDRsXC-fRKqFUVZ9w6d_WjNn7GAzy4TCEbBYOh8HhzjBtcPJ05N6e8v7egQjdFi3cddl1ajh5qHCWWDNxEvpEx0";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const registerPushServiceWorker = async () => {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Ask permission, subscribe the device and persist the subscription. */
export const subscribeToPush = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await registerPushServiceWorker();
  if (!registration) return false;
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return false;

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh || arrayBufferToBase64(subscription.getKey("p256dh"));
  const auth = json.keys?.auth || arrayBufferToBase64(subscription.getKey("auth"));

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push] failed to save subscription", error);
    return false;
  }
  return true;
};

/** Remove this device's subscription. */
export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
};

export const getPushSubscriptionState = async () => {
  if (!isPushSupported()) return { supported: false, subscribed: false, permission: "denied" as NotificationPermission };
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return { supported: true, subscribed: !!subscription, permission: Notification.permission };
};

export interface SendPushArgs {
  user_ids: string[] | "all";
  title: string;
  body: string;
  url?: string;
  type?: string;
}

/** Fire-and-forget push dispatch through the edge function. */
export const sendPush = async (args: SendPushArgs) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", { body: args });
    if (error) console.error("[push] send failed", error);
    return data;
  } catch (e) {
    console.error("[push] send failed", e);
    return null;
  }
};
