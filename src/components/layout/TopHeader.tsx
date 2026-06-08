import { Search, Bell, Users, Menu as MenuIcon, MessageSquareText, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import { Badge } from "@/components/ui/badge";
import prangonLogo from "@/assets/prangon-logo.png";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
    <header className="sticky top-0 z-40 bg-background/95 border-b border-border/40 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-2 sm:px-4 max-w-screen-xl mx-auto gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {!isHome && (
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Back"
              className="p-2 rounded-full text-foreground hover:bg-muted/80 transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95 shrink-0">
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
        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/friends"
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <Users className="h-5 w-5" />
          </Link>
          <Link
            to="/messages"
            className="relative p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <MessageSquareText className={cn(
              "h-5 w-5",
              unreadMessages > 0 && "text-primary"
            )} />
            {unreadMessages > 0 && (
              <Badge 
                className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground border-2 border-background"
              >
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </Badge>
            )}
          </Link>
          <Link
            to="/notifications"
            className="relative p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <Bell className={cn(
              "h-5 w-5",
              unreadCount > 0 && "text-primary"
            )} />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground border-2 border-background"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Link>
          <button
            onClick={() => navigate("/menu")}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
