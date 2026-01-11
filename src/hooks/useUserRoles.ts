import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "user" | "advisor" | "support";

interface UseUserRolesOptions {
  userId?: string;
  enabled?: boolean;
}

export const useUserRoles = ({ userId, enabled = true }: UseUserRolesOptions = {}) => {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }

      return data?.map((r) => r.role as AppRole) || [];
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Hook to fetch roles for multiple users at once (for feed optimization)
export const useUsersRoles = (userIds: string[]) => {
  return useQuery({
    queryKey: ["users-roles", userIds.sort().join(",")],
    queryFn: async () => {
      if (!userIds.length) return {};
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (error) {
        console.error("Error fetching users roles:", error);
        return {};
      }

      // Group roles by user_id
      const rolesMap: Record<string, AppRole[]> = {};
      data?.forEach((item) => {
        if (!rolesMap[item.user_id]) {
          rolesMap[item.user_id] = [];
        }
        rolesMap[item.user_id].push(item.role as AppRole);
      });

      return rolesMap;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
