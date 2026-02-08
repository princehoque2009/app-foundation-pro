import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const getDeviceId = (): string => {
  let id = localStorage.getItem("prangon_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("prangon_device_id", id);
  }
  return id;
};

const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux Device";
  return "Unknown Device";
};

export const useDeviceEnforcement = () => {
  const { user, signOut } = useAuth();

  const registerDevice = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("device-enforcement", {
        body: {
          action: "register",
          deviceId: getDeviceId(),
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        },
      });
      if (error) console.error("Device registration error:", error);
    } catch (err) {
      console.error("Device registration failed:", err);
    }
  }, [user?.id]);

  const checkDevice = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return true;
    try {
      const { data, error } = await supabase.functions.invoke("device-enforcement", {
        body: { action: "check", deviceId: getDeviceId() },
      });
      if (error) return true; // Allow on error
      return data?.allowed !== false;
    } catch {
      return true;
    }
  }, [user?.id]);

  // Register device on login
  useEffect(() => {
    if (user?.id) {
      registerDevice();
    }
  }, [user?.id, registerDevice]);

  // Periodic check every 30s
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const allowed = await checkDevice();
      if (!allowed) {
        signOut();
        // The user will be redirected to the logged-out page by auth flow
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [user?.id, checkDevice, signOut]);

  return { deviceId: getDeviceId(), deviceName: getDeviceName(), checkDevice };
};
