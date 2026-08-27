import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCurrentProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, cover_photo_url, is_verified, profile_theme")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};
