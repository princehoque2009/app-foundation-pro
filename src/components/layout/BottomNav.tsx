import { Home, Clapperboard, Plus, CircleDot, CircleUserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clapperboard, label: "Reels", path: "/reels" },
  { icon: CircleDot, label: "Circles", path: "/circles" },
  { icon: CircleUserRound, label: "Me", path: "/profile" },
];

const ACTIVE_COLOR = "#FF5A5F";
const INACTIVE_COLOR = "#B0B0B0";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="relative max-w-screen-xl mx-auto">
          {/* Floating Create Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-[#FF5A5F]/30"
              style={{ background: ACTIVE_COLOR }}
            >
              <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Background bar */}
          <div className="bg-background rounded-t-[22px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-border/30">
            <div className="flex items-center justify-around h-[68px] px-2">
              {navItems.map(({ icon: Icon, label, path }, index) => {
                const isActive = location.pathname === path;

                // Insert spacer for center button
                if (index === 2) {
                  return (
                    <div key="spacer" className="flex items-center">
                      <div className="w-14" /> {/* spacer for FAB */}
                      <Link
                        key={path}
                        to={path}
                        className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 pt-1"
                      >
                        <motion.div
                          whileTap={{ scale: 0.85 }}
                          className="flex items-center justify-center"
                        >
                          <Icon
                            className="h-[22px] w-[22px] transition-all duration-200"
                            style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                        </motion.div>
                        <span
                          className="text-[10px] font-medium transition-all duration-200"
                          style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: isActive ? 600 : 500 }}
                        >
                          {label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="bottomNavIndicator"
                            className="absolute bottom-1.5 w-1 h-1 rounded-full"
                            style={{ background: ACTIVE_COLOR }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                      </Link>
                    </div>
                  );
                }

                return (
                  <Link
                    key={path}
                    to={path}
                    className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 pt-1"
                  >
                    <motion.div
                      whileTap={{ scale: 0.85 }}
                      className="flex items-center justify-center"
                    >
                      <Icon
                        className="h-[22px] w-[22px] transition-all duration-200"
                        style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    </motion.div>
                    <span
                      className="text-[10px] font-medium transition-all duration-200"
                      style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: isActive ? 600 : 500 }}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute bottom-1.5 w-1 h-1 rounded-full"
                        style={{ background: ACTIVE_COLOR }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[320px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Create</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {[
              { label: "New Post", desc: "Share a photo or text", path: "/create" },
              { label: "New Reel", desc: "Record a short video", path: "/create" },
              { label: "Post in Circle", desc: "Share with your circle", path: "/circles" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setShowCreate(false);
                  navigate(item.path);
                }}
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
