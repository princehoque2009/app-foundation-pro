import { Home, Clapperboard, Plus, CircleDot, CircleUserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const ACTIVE = "#FF5A5F";
const INACTIVE = "#B0B0B0";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Clapperboard, label: t("nav.reels"), path: "/reels" },
    { icon: CircleDot, label: t("nav.circles"), path: "/circles" },
    { icon: CircleUserRound, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="relative max-w-screen-xl mx-auto px-2 pb-2">
        {/* Floating Create Button — coral gradient with glow */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            onClick={() => navigate("/create")}
            aria-label="Create"
            className="relative flex items-center justify-center w-[58px] h-[58px] rounded-full bg-coral-gradient shadow-coral ring-4 ring-background"
          >
            <span className="absolute inset-0 rounded-full bg-coral-gradient blur-md opacity-50 -z-10" />
            <Plus className="h-7 w-7 text-white" strokeWidth={2.6} />
          </motion.button>
        </div>

        {/* Glass Bar */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="grid grid-cols-5 h-[64px] items-center">
            {navItems.map(({ icon: Icon, label, path }, index) => {
              const isActive = location.pathname === path;
              const col = index >= 2 ? index + 1 : index;

              return (
                <Link
                  key={path}
                  to={path}
                  className="relative flex flex-col items-center justify-center h-full gap-0.5 pt-1"
                  style={{ gridColumn: col + 1 }}
                >
                  <motion.div whileTap={{ scale: 0.85 }} className="flex items-center justify-center">
                    <Icon
                      className="h-[22px] w-[22px] transition-colors duration-200"
                      style={{ color: isActive ? ACTIVE : INACTIVE }}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] transition-colors duration-200"
                    style={{ color: isActive ? ACTIVE : INACTIVE, fontWeight: isActive ? 600 : 500 }}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute bottom-1.5 w-1 h-1 rounded-full"
                      style={{ background: ACTIVE }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </Link>
              );
            })}
            <div className="flex items-center justify-center" style={{ gridColumn: 3 }}>
              <div className="w-[52px]" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
