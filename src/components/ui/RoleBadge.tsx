import { Shield, Star, BadgeCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleType = "admin" | "moderator" | "creator" | "official" | "advisor" | "support";

interface RoleBadgeProps {
  role: RoleType;
  size?: "sm" | "md";
  className?: string;
}

const roleConfig: Record<RoleType, { 
  label: string; 
  icon: typeof Shield; 
  className: string;
}> = {
  admin: {
    label: "Admin",
    icon: Crown,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  moderator: {
    label: "Mod",
    icon: Shield,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  creator: {
    label: "Creator",
    icon: Star,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  official: {
    label: "Official",
    icon: BadgeCheck,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  advisor: {
    label: "Advisor",
    icon: Shield,
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  support: {
    label: "Support",
    icon: Shield,
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
};

export const RoleBadge = ({ role, size = "sm", className }: RoleBadgeProps) => {
  const config = roleConfig[role];
  if (!config) return null;

  const Icon = config.icon;
  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      <Icon className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </span>
  );
};

interface UserRoleBadgesProps {
  roles: RoleType[];
  size?: "sm" | "md";
  className?: string;
}

export const UserRoleBadges = ({ roles, size = "sm", className }: UserRoleBadgesProps) => {
  if (!roles || roles.length === 0) return null;

  // Priority order for display
  const priorityOrder: RoleType[] = ["admin", "official", "moderator", "advisor", "support", "creator"];
  const sortedRoles = roles.sort((a, b) => 
    priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
  );

  // Only show the highest priority role to keep it clean
  const topRole = sortedRoles[0];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <RoleBadge role={topRole} size={size} />
    </div>
  );
};
