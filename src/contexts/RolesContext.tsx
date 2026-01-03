import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "moderator" | "user";

interface RolesContextType {
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  hasRole: (role: AppRole) => boolean;
  refetch: () => Promise<void>;
}

const RolesContext = createContext<RolesContextType | undefined>(undefined);

export const RolesProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        setRoles([]);
      } else {
        setRoles(data?.map((r) => r.role as AppRole) || []);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch - wait for auth to complete
  useEffect(() => {
    if (authLoading) return;
    fetchRoles();
  }, [fetchRoles, authLoading]);

  // Real-time subscription for immediate role changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-roles-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Role changed:", payload);
          // Immediately refetch roles
          fetchRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchRoles]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator") || isAdmin;

  return (
    <RolesContext.Provider
      value={{
        roles,
        loading: authLoading || loading,
        isAdmin,
        isModerator,
        hasRole,
        refetch: fetchRoles,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
};

export const useRoles = () => {
  const context = useContext(RolesContext);
  if (context === undefined) {
    // Return safe defaults if used outside provider
    return {
      roles: [] as AppRole[],
      loading: false,
      isAdmin: false,
      isModerator: false,
      hasRole: () => false,
      refetch: async () => {},
    };
  }
  return context;
};
