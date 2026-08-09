import { House, Clapperboard, Plus, Orbit } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { useScrollCollapse, usePrefersReducedMotion, SPRING } from "@/hooks/useScrollCollapse";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface BottomNavProps {
  /** Force collapsed (Reels pages instead of scrolling) */
  forceCollapsed?: boolean;
  /** Dim to 50% opacity when idle */
  dimmed?: boolean;
}

const ProfileAvatar = memo(
  ({ size, active }: { size: number; active: boolean }) => {
    const { data: profile } = useCurrentProfile();
    const initials = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();
    return (
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-muted transition-[box-shadow,width,height] duration-200",
          active ? "ring-2 ring-primary" : "ring-[1.5px] ring-border"
        )}
        style={{ width: size, height: size }}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="text-[11px] font-semibold text-muted-foreground">{initials}</span>
        )}
      </span>
    );
  }
);
ProfileAvatar.displayName = "ProfileAvatar";

export const BottomNav = memo(({ forceCollapsed = false, dimmed = false }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { collapsed: scrollCollapsed } = useScrollCollapse();
  const reduced = usePrefersReducedMotion();
  const collapsed = forceCollapsed || scrollCollapsed;
  const spring = reduced ? { duration: 0.18 } : SPRING;

  const items = [
    { key: "home", icon: House, label: t("nav.home"), path: "/", persist: true },
    { key: "reels", icon: Clapperboard, label: t("nav.reels"), path: "/reels", persist: false },
    { key: "circles", icon: Orbit, label: t("nav.circles"), path: "/circles", persist: false },
    { key: "profile", icon: null, label: t("nav.profile"), path: "/profile", persist: true },
  ];

  const visible = items.filter((i) => (collapsed ? i.persist : true));
  const leading = visible.filter((i) => i.key === "home" || i.key === "reels");
  const trailing = visible.filter((i) => i.key === "circles" || i.key === "profile");

  const renderItem = (item: (typeof items)[number]) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <motion.div
        key={item.key}
        layout
        initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
        transition={spring}
        className="overflow-hidden"
      >
        <Link
          to={item.path}
          aria-current={isActive ? "page" : undefined}
          aria-label={item.label}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 lg-press lg-focus rounded-full",
            collapsed ? "h-11 w-[52px]" : "h-[52px] w-[62px]"
          )}
        >
          {isActive && (
            <motion.span
              layoutId="bottomNavPill"
              className="absolute inset-0 rounded-full bg-primary/10"
              transition={reduced ? { duration: 0.15 } : SPRING}
            />
          )}
          {Icon ? (
            <Icon
              className={cn(
                "relative transition-colors duration-200",
                collapsed ? "h-[22px] w-[22px]" : "h-[21px] w-[21px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              strokeWidth={isActive ? 2.1 : 1.6}
            />
          ) : (
            <span className="relative">
              <ProfileAvatar size={collapsed ? 30 : 26} active={isActive} />
            </span>
          )}
          {!collapsed && (
            <span
              className={cn(
                "relative text-[10px] font-medium tracking-[0.2px] transition-colors duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          )}
        </Link>
      </motion.div>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom pointer-events-none"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-screen-sm px-4">
        <motion.div
          layout
          transition={spring}
          animate={{ opacity: dimmed ? 0.5 : 1 }}
          className="lg-glass lg-sheen lg-pill pointer-events-auto mx-auto flex w-fit items-center gap-1 px-2 py-1.5"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {leading.map(renderItem)}
          </AnimatePresence>

          <motion.button
            layout
            whileTap={reduced ? undefined : { scale: 0.92 }}
            transition={spring}
            onClick={() => navigate("/create")}
            aria-label="Create"
            className="lg-fab lg-focus mx-1 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full"
          >
            <Plus className="h-6 w-6" strokeWidth={2.2} />
          </motion.button>

          <AnimatePresence initial={false} mode="popLayout">
            {trailing.map(renderItem)}
          </AnimatePresence>
        </motion.div>
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
