import { House, Clapperboard, Plus, Orbit, CircleUser } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: House, label: t("nav.home"), path: "/" },
    { icon: Clapperboard, label: t("nav.reels"), path: "/reels" },
    { icon: Orbit, label: t("nav.circles"), path: "/circles" },
    { icon: CircleUser, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="relative max-w-screen-sm mx-auto px-3 pb-3">
        {/* Floating Create Button — clean, no glow */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 340, damping: 20 }}
            onClick={() => navigate("/create")}
            aria-label="Create"
            className="lg-fab flex items-center justify-center w-[56px] h-[56px] rounded-full"
          >
            <Plus className="h-6 w-6" strokeWidth={2.2} />
          </motion.button>
        </div>

        {/* Glass bar */}
        <div className="lg-bar rounded-[26px] overflow-hidden">
          <div className="grid grid-cols-5 h-[62px] items-center">
            {navItems.map(({ icon: Icon, label, path }, index) => {
              const isActive = location.pathname === path;
              const col = index >= 2 ? index + 1 : index;

              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex flex-col items-center justify-center h-full gap-1 lg-press"
                  style={{ gridColumn: col + 1 }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bottomNavPill"
                      className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/10"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-[21px] w-[21px] transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.1 : 1.6}
                  />
                  <span
                    className={cn(
                      "relative text-[10px] tracking-tight transition-colors duration-200",
                      isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
            <div style={{ gridColumn: 3 }} />
          </div>
        </div>
      </div>
    </nav>
  );
};
