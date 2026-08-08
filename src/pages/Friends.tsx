import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MyFriends } from "@/components/friends/MyFriends";
import { FriendSuggestions } from "@/components/friends/FriendSuggestions";
import { SearchFriends } from "@/components/friends/SearchFriends";
import { Users, Sparkles, Search as SearchIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "followers", label: "Followers", icon: Users },
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "search", label: "Search", icon: SearchIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

const Friends = () => {
  const [tab, setTab] = useState<TabId>("followers");

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <div className="sticky top-14 z-30 -mx-4 px-4 pt-5 pb-3 lg-nav">
          <h1 className="text-[22px] font-bold tracking-tight mb-3">People</h1>

          {/* Glass segmented control */}
          <div className="lg-bar grid grid-cols-3 gap-1 p-1 rounded-2xl">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-medium lg-press",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="followersTab"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
                    />
                  )}
                  <Icon className="relative h-[15px] w-[15px]" />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 animate-fade-in">
          {tab === "followers" && <MyFriends />}
          {tab === "discover" && <FriendSuggestions />}
          {tab === "search" && <SearchFriends />}
        </div>
      </div>
    </MainLayout>
  );
};

export default Friends;
