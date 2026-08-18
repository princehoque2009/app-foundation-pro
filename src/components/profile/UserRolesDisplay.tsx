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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  if (!roles || roles.length === 0 || roles.every((r) => r === "user")) return null;

  const displayableRoles = roles.filter((r) => r !== "user");
  if (displayableRoles.length === 0) return null;

  const priorityOrder: AppRole[] = ["admin", "moderator", "advisor", "support"];
  const sortedRoles = displayableRoles.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
  const topRole = sortedRoles[0];

  const roleMap: Record<AppRole, "admin" | "moderator" | "advisor" | "support" | "creator" | "official"> = {
    admin: "admin",
    moderator: "moderator",
    advisor: "advisor",
    support: "support",
    user: "creator",
  };

  return (
    <div className={className}>
      <RoleBadge role={roleMap[topRole]} size={size} />
    </div>
  );
};
