import { cn } from "@/lib/utils";
import { Crown, ShieldCheck } from "lucide-react";

type CircleRole = "admin" | "moderator" | "member";

interface CircleRoleBadgeProps {
  role: CircleRole;
  className?: string;
}

const config: Record<string, { label: string; icon: typeof Crown; className: string }> = {
  admin: {
    label: "Admin",
    icon: Crown,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  moderator: {
    label: "Mod",
    icon: ShieldCheck,
    className: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  },
};

export const CircleRoleBadge = ({ role, className }: CircleRoleBadgeProps) => {
  const c = config[role];
  if (!c) return null;

  const Icon = c.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border font-medium px-1.5 py-0.5 text-[10px]",
        c.className,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </span>
  );
};
