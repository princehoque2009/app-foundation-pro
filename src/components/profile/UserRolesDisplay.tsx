import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleBadge } from "@/components/ui/RoleBadge";

type AppRole = "admin" | "moderator" | "user" | "advisor" | "support";

interface UserRolesDisplayProps {
  userId: string;
  className?: string;
  size?: "sm" | "md";
}

export const UserRolesDisplay = ({ userId, className, size = "sm" }: UserRolesDisplayProps) => {
  const { data: roles } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data?.map((r) => r.role as AppRole) || [];
    },
    enabled: !!userId,
  });

  if (!roles || roles.length === 0 || roles.every((r) => r === "user")) {
    return null;
  }

  // Map app_role to RoleBadge compatible types
  const displayableRoles = roles.filter((r) => r !== "user");
  
  if (displayableRoles.length === 0) return null;

  // Priority order
  const priorityOrder: AppRole[] = ["admin", "moderator", "advisor", "support"];
  const sortedRoles = displayableRoles.sort(
    (a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
  );

  // Show only the highest priority role
  const topRole = sortedRoles[0];

  // Map to RoleBadge type
  const roleMap: Record<AppRole, "admin" | "moderator" | "advisor" | "support" | "creator" | "official"> = {
    admin: "admin",
    moderator: "moderator",
    advisor: "advisor",
    support: "support",
    user: "creator", // fallback
  };

  return (
    <div className={className}>
      <RoleBadge role={roleMap[topRole]} size={size} />
    </div>
  );
};
