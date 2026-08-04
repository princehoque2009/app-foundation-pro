import { MessageCircle, Phone, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessengerTab = "chats" | "calls" | "people" | "settings";

const TABS: { key: MessengerTab; label: string; icon: typeof MessageCircle }[] = [
  { key: "chats", label: "Chats", icon: MessageCircle },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "people", label: "People", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
];

interface MessengerTabBarProps {
  active: MessengerTab;
  onChange: (tab: MessengerTab) => void;
  unreadCount?: number;
}

export const MessengerTabBar = ({ active, onChange, unreadCount = 0 }: MessengerTabBarProps) => (
  <nav className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md">
    <div className="flex items-center justify-between rounded-3xl bg-background/80 backdrop-blur-2xl border border-border/70 shadow-xl px-2 py-1.5">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="relative">
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.6} />
              {key === "chats" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className={cn("text-[10.5px]", isActive ? "font-semibold" : "font-medium")}>
              {label}
            </span>
            {isActive && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);
