import { MessageCircle, Phone, Users, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion, SPRING } from "@/hooks/useScrollCollapse";

export type MessengerTab = "chats" | "calls" | "people" | "settings";

const TABS: { key: MessengerTab; label: string; icon: typeof MessageCircle }[] = [
  { key: "chats", label: "Chats", icon: MessageCircle },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "people", label: "People", icon: Users },
  { key: "settings", label: "Settings", icon: Settings2 },
];

interface MessengerTabBarProps {
  active: MessengerTab;
  onChange: (tab: MessengerTab) => void;
  unreadCount?: number;
}

export const MessengerTabBar = memo(({ active, onChange, unreadCount = 0 }: MessengerTabBarProps) => {
  const reduced = usePrefersReducedMotion();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4"
      style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
    >
      <div className="lg-glass lg-sheen lg-pill pointer-events-auto mx-auto flex w-full max-w-[380px] items-center justify-between gap-1 px-2.5 py-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 lg-press lg-focus",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="messengerTabPill"
                  className="absolute inset-0 rounded-full bg-primary/10"
                  transition={reduced ? { duration: 0.15 } : SPRING}
                />
              )}
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.1 : 1.6} />
                {key === "chats" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "relative text-[10px] tracking-[0.2px]",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

MessengerTabBar.displayName = "MessengerTabBar";
