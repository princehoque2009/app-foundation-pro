import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the current user is an admin.
 * Uses direct database query for contexts where RolesProvider may not be available.
 */
export const useIsAdmin = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // Cache for 1 minute (reduced for faster updates)
    refetchOnWindowFocus: true, // Refetch on window focus for real-time updates
  });
};
