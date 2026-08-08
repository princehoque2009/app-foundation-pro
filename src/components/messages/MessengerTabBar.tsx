import { MessageCircle, Phone, Users, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

export const MessengerTabBar = ({ active, onChange, unreadCount = 0 }: MessengerTabBarProps) => (
  <nav className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md">
    <div className="lg-bar flex items-center justify-between rounded-[26px] px-1.5 py-1.5">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl lg-press",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.span
                layoutId="messengerTabPill"
                className="absolute inset-0 rounded-2xl bg-primary/10"
                transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
              />
            )}
            <span className="relative">
              <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.1 : 1.6} />
              {key === "chats" && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className={cn("relative text-[10px] tracking-tight", isActive ? "font-semibold" : "font-medium")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);
