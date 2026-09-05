import { Search, Bell, Users, Menu as MenuIcon, MessageCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import prangonLogo from "@/assets/prangon-logo.png";
import { cn } from "@/lib/utils";
import { useMemo, memo } from "react";
import { useScrollCollapse, usePrefersReducedMotion, SPRING } from "@/hooks/useScrollCollapse";

const IconLink = ({
  to,
  onClick,
  label,
  children,
  count = 0,
  active,
}: {
  to?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  count?: number;
  active?: boolean;
}) => {
  const cls = cn(
    "relative flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full lg-press lg-focus transition-all duration-200 shrink-0",
    active 
      ? "text-primary bg-primary/12 ring-1 ring-primary/20" 
      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted"
  );
  const badge = count > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-0.5 sm:px-1 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold flex items-center justify-center ring-2 ring-background shadow-sm animate-bounce-in">
      {count > 99 ? "99+" : count}
    </span>
  );
  if (to) {
    return (
      <Link to={to} aria-label={label} className={cls}>
        {children}
        {badge}
      </Link>
    );
  }
  return (
    <button onClick={onClick} aria-label={label} className={cls}>
      {children}
      {badge}
    </button>
  );
};

export const TopHeader = memo(() => {
  const { unreadCount } = useNotifications();
  const { conversations } = useConversations();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { collapsed } = useScrollCollapse();
  const reduced = usePrefersReducedMotion();
  const spring = reduced ? { duration: 0.18 } : SPRING;

  const unreadMessages = useMemo(() => {
    if (!conversations) return 0;
    return conversations.filter((c: any) => c?.lastMessage && !c.lastMessage.is_read).length;
  }, [conversations]);

  return (
    <header className="sticky top-0 z-40 pt-3 pb-2 px-2 sm:px-3 w-full overflow-hidden">
      <motion.div
        layout
        transition={spring}
        className={cn(
          "lg-glass lg-sheen lg-pill mx-auto flex w-full max-w-[720px] items-center justify-between gap-1.5 sm:gap-3 pl-2.5 pr-1.5 sm:pl-3.5 sm:pr-2 border border-border/70 shadow-[0_2px_6px_hsl(20_12%_10%/0.07),0_8px_24px_hsl(355_20%_50%/0.08),0_0_0_1px_hsl(28_22%_84%/0.75),inset_0_1px_0_hsl(0_0%_100%/0.9)] overflow-hidden box-border",
          collapsed ? "h-[48px]" : "h-[52px] sm:h-[56px]",
          "dark:border-white/10 dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]"
        )}
      >
        {/* Left - logo + back - can shrink */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1 overflow-hidden">
          {!isHome && (
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Back"
              className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/80 lg-press lg-focus transition-colors"
            >
              <ArrowLeft className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={2} />
            </button>
          )}
          <Link to="/" className="flex min-w-0 shrink items-center gap-2 pl-0.5 sm:pl-1 lg-press lg-focus rounded-full group overflow-hidden">
            <img
              src={prangonLogo}
              alt="Prangon"
              className="pointer-events-none h-[22px] sm:h-[30px] w-auto max-w-[90px] sm:max-w-none shrink select-none object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        </div>

        {/* Right - icons - always shrink-0, tight gap on mobile */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 ml-auto">
          <AnimatePresence initial={false} mode="popLayout">
            {!collapsed && (
              <>
                <motion.div
                  key="search"
                  layout
                  initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  transition={spring}
                  className="overflow-hidden"
                >
                  <IconLink to="/search" label="Search" active={location.pathname === "/search"}>
                    <Search className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={1.75} />
                  </IconLink>
                </motion.div>
                <motion.div
                  key="friends"
                  layout
                  initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  transition={spring}
                  className="overflow-hidden hidden xs:flex sm:flex"
                >
                  <IconLink to="/friends" label="Followers" active={location.pathname === "/friends"}>
                    <Users className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={1.75} />
                  </IconLink>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="h-5 sm:h-6 w-px bg-border/60 mx-0.5 sm:mx-1 hidden sm:block shrink-0" />

          <IconLink to="/messages" label="Messages" count={unreadMessages}>
            <MessageCircle className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={1.75} />
          </IconLink>
          <IconLink to="/notifications" label="Notifications" count={unreadCount}>
            <Bell className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={1.75} />
          </IconLink>

          {/* Menu - ALWAYS visible, never collapse - fixes hamburger going outside */}
          <IconLink onClick={() => navigate("/menu")} label="Menu">
            <MenuIcon className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" strokeWidth={1.75} />
          </IconLink>
        </div>
      </motion.div>
    </header>
  );
});

TopHeader.displayName = "TopHeader";
