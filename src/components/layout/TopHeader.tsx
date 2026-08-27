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
    "relative flex items-center justify-center h-10 w-10 rounded-full lg-press lg-focus transition-all duration-200",
    active 
      ? "text-primary bg-primary/12 ring-1 ring-primary/20" 
      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted"
  );
  const badge = count > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background shadow-sm animate-bounce-in">
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

  const secondary = [
    {
      key: "search",
      node: (
        <IconLink to="/search" label="Search" active={location.pathname === "/search"}>
          <Search className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </IconLink>
      ),
    },
    {
      key: "friends",
      node: (
        <IconLink to="/friends" label="Followers" active={location.pathname === "/friends"}>
          <Users className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </IconLink>
      ),
    },
    {
      key: "menu",
      node: (
        <IconLink onClick={() => navigate("/menu")} label="Menu">
          <MenuIcon className="h-[20px] w-[20px]" strokeWidth={1.75} />
        </IconLink>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-40 pt-3 pb-2 px-3">
      <motion.div
        layout
        transition={spring}
        className={cn(
          "lg-glass lg-sheen lg-pill mx-auto flex max-w-[720px] items-center justify-between gap-3 pl-3.5 pr-2 border border-white/40 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
          collapsed ? "h-[48px]" : "h-[56px]",
          "dark:border-white/10"
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          {!isHome && (
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/80 lg-press lg-focus transition-colors"
            >
              <ArrowLeft className="h-[20px] w-[20px]" strokeWidth={2} />
            </button>
          )}
          <Link to="/" className="flex shrink-0 items-center gap-2 pl-1 lg-press lg-focus rounded-full group">
            <img
              src={prangonLogo}
              alt="Prangon"
              className="pointer-events-none h-[30px] w-auto shrink-0 select-none object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {!collapsed &&
              secondary.slice(0, 2).map((item) => (
                <motion.div
                  key={item.key}
                  layout
                  initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                  transition={spring}
                  className="overflow-hidden"
                >
                  {item.node}
                </motion.div>
              ))}
          </AnimatePresence>

          <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />

          <IconLink to="/messages" label="Messages" count={unreadMessages}>
            <MessageCircle className="h-[20px] w-[20px]" strokeWidth={1.75} />
          </IconLink>
          <IconLink to="/notifications" label="Notifications" count={unreadCount}>
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.75} />
          </IconLink>

          <AnimatePresence initial={false} mode="popLayout">
            {!collapsed && (
              <motion.div
                key="menu"
                layout
                initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.9 }}
                transition={spring}
                className="overflow-hidden"
              >
                {secondary[2].node}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </header>
  );
});

TopHeader.displayName = "TopHeader";
