import { Home, Clapperboard, Plus, CircleDot, CircleUserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const ACTIVE = "#FF5A5F";
const INACTIVE = "#B0B0B0";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Clapperboard, label: t("nav.reels"), path: "/reels" },
    { icon: CircleDot, label: t("nav.circles"), path: "/circles" },
    { icon: CircleUserRound, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="relative max-w-screen-xl mx-auto">
          {/* Floating Create Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center w-[52px] h-[52px] rounded-full shadow-lg shadow-[#FF5A5F]/25"
              style={{ background: ACTIVE }}
            >
              <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Bar */}
          <div className="bg-background rounded-t-[22px] shadow-[0_-2px_16px_rgba(0,0,0,0.06)] border-t border-border/30">
            <div className="grid grid-cols-5 h-[66px] items-center">
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
              {/* Empty center column */}
              <div className="flex items-center justify-center" style={{ gridColumn: 3 }}>
                <div className="w-[52px]" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[320px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{t("nav.create")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 pt-2">
            {[
              { label: t("create.title"), desc: t("create.addPhoto"), path: "/create" },
              { label: t("nav.reels"), desc: t("create.addVideo"), path: "/create" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setShowCreate(false); navigate(item.path); }}
                className="flex flex-col items-start p-3 rounded-xl hover:bg-muted/80 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
