import { Home, Clapperboard, SquarePlus, MessageSquareText, CircleUserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: SquarePlus, label: "Create", path: "/create", isCenter: true },
  { icon: MessageSquareText, label: "Messages", path: "/messages" },
  { icon: CircleUserRound, label: "Profile", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Bridge / notch shape */}
      <div className="relative max-w-screen-xl mx-auto">
        {/* Background with bridge cutout */}
        <svg
          className="absolute inset-x-0 -top-4 w-full h-[calc(100%+16px)] pointer-events-none"
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,16 L155,16 C160,16 165,16 170,20 C175,28 180,36 200,36 C220,36 225,28 230,20 C235,16 240,16 245,16 L400,16 L400,80 L0,80 Z"
            className="fill-background stroke-border"
            strokeWidth="0.5"
          />
        </svg>

        <div className="relative flex items-end justify-around h-16 px-2">
          {navItems.map(({ icon: Icon, label, path, isCenter }) => {
            const isActive = location.pathname === path;

            if (isCenter) {
              return (
                <Link
                  key={path}
                  to={path}
                  className="relative -mt-6 flex items-center justify-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-primary/30"
                        : "bg-primary/90 text-primary-foreground shadow-primary/20"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all pt-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex items-center justify-center"
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium transition-all",
                  isActive ? "font-semibold text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavDot"
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
