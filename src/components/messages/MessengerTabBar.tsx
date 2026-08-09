import { MessageCircle, Phone, Users, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { useScrollCollapse, usePrefersReducedMotion, SPRING } from "@/hooks/useScrollCollapse";

export type MessengerTab = "chats" | "calls" | "people" | "settings";

const TABS: { key: MessengerTab; label: string; icon: typeof MessageCircle; persist: boolean }[] = [
  { key: "chats", label: "Chats", icon: MessageCircle, persist: true },
  { key: "calls", label: "Calls", icon: Phone, persist: false },
  { key: "people", label: "People", icon: Users, persist: false },
  { key: "settings", label: "Settings", icon: Settings2, persist: true },
];

interface MessengerTabBarProps {
  active: MessengerTab;
  onChange: (tab: MessengerTab) => void;
  unreadCount?: number;
}

export const MessengerTabBar = memo(({ active, onChange, unreadCount = 0 }: MessengerTabBarProps) => {
  const { collapsed } = useScrollCollapse();
  const reduced = usePrefersReducedMotion();
  const spring = reduced ? { duration: 0.18 } : SPRING;

  const visible = TABS.filter((t) => !collapsed || t.persist || t.key === active);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <motion.div
        layout
        transition={spring}
        className="lg-glass lg-sheen lg-pill pointer-events-auto mx-auto flex w-fit items-center gap-1 px-2 py-1.5"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map(({ key, label, icon: Icon, persist }) => {
            const isActive = active === key;
            return (
              <motion.button
                key={key}
                layout
                initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                transition={spring}
                onClick={() => onChange(key)}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-full lg-press lg-focus overflow-hidden",
                  collapsed ? "h-11 w-[52px]" : "h-[52px] w-[68px]",
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
                {!collapsed && (
                  <span
                    className={cn(
                      "relative text-[10px] tracking-[0.2px]",
                      isActive ? "font-semibold" : "font-medium"
                    )}
                  >
                    {label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </nav>
  );
});

MessengerTabBar.displayName = "MessengerTabBar";
