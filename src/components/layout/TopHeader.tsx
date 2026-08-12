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
    "relative flex items-center justify-center h-11 w-11 rounded-full lg-press lg-focus transition-colors",
    active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
  );
  const badge = count > 0 && (
    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
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
          <Search className="h-[21px] w-[21px]" />
        </IconLink>
      ),
    },
    {
      key: "friends",
      node: (
        <IconLink to="/friends" label="Followers" active={location.pathname === "/friends"}>
          <Users className="h-[21px] w-[21px]" />
        </IconLink>
      ),
    },
    {
      key: "menu",
      node: (
        <IconLink onClick={() => navigate("/menu")} label="Menu">
          <MenuIcon className="h-[21px] w-[21px]" />
        </IconLink>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-40 pt-2 pb-1 px-3">
      <motion.div
        layout
        transition={spring}
        className={cn(
          "lg-glass lg-sheen lg-pill mx-auto flex max-w-screen-xl items-center justify-between gap-3 pl-3 pr-2",
          collapsed ? "h-12" : "h-14"
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          {!isHome && (
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/70 lg-press lg-focus"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex shrink-0 items-center gap-2 pl-1 lg-press lg-focus rounded-full">
            <img
              src={prangonLogo}
              alt="Prangon"
              className="pointer-events-none h-8 w-auto shrink-0 select-none object-contain object-left"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
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

          <IconLink to="/messages" label="Messages" count={unreadMessages}>
            <MessageCircle className="h-[21px] w-[21px]" />
          </IconLink>
          <IconLink to="/notifications" label="Notifications" count={unreadCount}>
            <Bell className="h-[21px] w-[21px]" />
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
