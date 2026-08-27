import { House, Clapperboard, Plus, Orbit } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { useScrollCollapse, usePrefersReducedMotion, SPRING } from "@/hooks/useScrollCollapse";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface BottomNavProps {
  forceCollapsed?: boolean;
  dimmed?: boolean;
}

const ProfileAvatar = memo(
  ({ size, active }: { size: number; active: boolean }) => {
    const { data: profile } = useCurrentProfile();
    const initials = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();
    return (
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-muted transition-all duration-200",
          active ? "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-sm" : "ring-1 ring-border/60"
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
            "relative flex flex-col items-center justify-center gap-1 lg-press lg-focus rounded-full transition-all",
            collapsed ? "h-11 w-[52px]" : "h-[54px] w-[64px]"
          )}
        >
          {isActive && (
            <motion.span
              layoutId="bottomNavPill"
              className="absolute inset-0 rounded-full bg-primary/[0.10] border border-primary/15 shadow-[inset_0_1px_0_hsl(var(--primary)/0.1)]"
              transition={reduced ? { duration: 0.15 } : SPRING}
            />
          )}
          {Icon ? (
            <Icon
              className={cn(
                "relative transition-all duration-200",
                collapsed ? "h-[22px] w-[22px]" : "h-[22px] w-[22px]",
                isActive ? "text-primary" : "text-muted-foreground/80"
              )}
              strokeWidth={isActive ? 2.25 : 1.7}
            />
          ) : (
            <span className="relative">
              <ProfileAvatar size={collapsed ? 30 : 26} active={isActive} />
            </span>
          )}
          {!collapsed && (
            <span
              className={cn(
                "relative text-[10.5px] font-medium tracking-[0.15px] transition-colors duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground/70"
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
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-screen-sm px-4">
        <motion.div
          layout
          transition={spring}
          animate={{ opacity: dimmed ? 0.5 : 1, y: dimmed ? 4 : 0 }}
          className="lg-glass lg-sheen lg-pill pointer-events-auto mx-auto flex w-fit items-center gap-1.5 px-2.5 py-2 border border-white/40 dark:border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-[32px]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {leading.map(renderItem)}
          </AnimatePresence>

          <motion.button
            layout
            whileTap={reduced ? undefined : { scale: 0.92 }}
            whileHover={reduced ? undefined : { scale: 1.04, y: -1 }}
            transition={spring}
            onClick={() => navigate("/create")}
            aria-label="Create"
            className="lg-fab lg-focus mx-1 flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} />
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
