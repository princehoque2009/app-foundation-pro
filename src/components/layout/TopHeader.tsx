import { Search, Bell, Users, Menu as MenuIcon, MessageCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import prangonLogo from "@/assets/prangon-logo.png";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
    "relative flex items-center justify-center h-10 w-10 rounded-full lg-press transition-colors",
    active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
  );
  const badge = count > 0 && (
    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
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

export const TopHeader = () => {
  const { unreadCount } = useNotifications();
  const { conversations } = useConversations();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const unreadMessages = useMemo(() => {
    if (!conversations) return 0;
    return conversations.filter((c: any) => c?.lastMessage && !c.lastMessage.is_read).length;
  }, [conversations]);

  return (
    <header className="sticky top-0 z-40 lg-nav">
      <div className="flex items-center justify-between h-14 px-2 sm:px-4 max-w-screen-xl mx-auto gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {!isHome && (
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Back"
              className="flex items-center justify-center h-10 w-10 rounded-full text-foreground hover:bg-muted/70 lg-press shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 lg-press shrink-0">
            <img
              src={prangonLogo}
              alt="Prangon"
              className="h-8 object-contain pointer-events-none select-none"
              width="126"
              height="32"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        </div>
        <div className="flex items-center gap-0.5">
          <IconLink to="/search" label="Search" active={location.pathname === "/search"}>
            <Search className="h-[21px] w-[21px]" />
          </IconLink>
          <IconLink to="/friends" label="Followers" active={location.pathname === "/friends"}>
            <Users className="h-[21px] w-[21px]" />
          </IconLink>
          <IconLink to="/messages" label="Messages" count={unreadMessages}>
            <MessageCircle className="h-[21px] w-[21px]" />
          </IconLink>
          <IconLink to="/notifications" label="Notifications" count={unreadCount}>
            <Bell className="h-[21px] w-[21px]" />
          </IconLink>
          <IconLink onClick={() => navigate("/menu")} label="Menu">
            <MenuIcon className="h-[21px] w-[21px]" />
          </IconLink>
        </div>
      </div>
    </header>
  );
};
