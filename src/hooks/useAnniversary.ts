import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_END, eventIsActive, type CollectibleId } from "@/lib/anniversaryRules";

export function useAnniversaryClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((EVENT_END - now) / 1000));
  return { now, active: eventIsActive(now), days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}

export interface Wrapped {
  posts: number; reels: number; stories: number; likes: number; comments: number; views: number; joined_at: string;
  top_post: { id: string; caption: string | null; media_url: string | null; likes: number } | null;
}
export interface Capsule { id: string; created_at: string; opens_at: string; message: string | null }

export function useAnniversaryData() {
  const { user } = useAuth();
  const client = useQueryClient();
  const wrapped = useQuery({ queryKey: ["anniversary-wrapped", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.rpc("anniversary_wrapped");
    if (error) throw new Error(error.message);
    return data as unknown as Wrapped;
  } });
  const awards = useQuery({ queryKey: ["anniversary-awards", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from("anniversary_collectibles").select("badge,earned_at").eq("user_id", user?.id ?? "");
    if (error) throw new Error(error.message);
    return data;
  } });
  const capsule = useQuery({ queryKey: ["anniversary-capsule", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.rpc("anniversary_capsule");
    if (error) throw new Error(error.message);
    return data as unknown as Capsule | null;
  } });
  const claim = useMutation({ mutationFn: async (badge: CollectibleId) => {
    const { error } = await supabase.rpc("claim_anniversary_collectible", { p_badge: badge });
    if (error) throw new Error(error.message);
  }, onSuccess: () => { client.invalidateQueries({ queryKey: ["anniversary-awards"] }); } });
  const seal = useMutation({ mutationFn: async (message: string) => {
    const { data, error } = await supabase.rpc("anniversary_capsule", { p_message: message });
    if (error) throw new Error(error.message);
    return data as unknown as Capsule;
  }, onSuccess: (data) => { client.setQueryData(["anniversary-capsule", user?.id], data); } });
  return { wrapped, awards, capsule, claim, seal };
}