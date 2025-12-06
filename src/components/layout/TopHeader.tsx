import { Search, Bell, Users, Menu as MenuIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import prangonLogo from "@/assets/prangon-logo.png";
import { cn } from "@/lib/utils";

export const TopHeader = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img 
            src={prangonLogo} 
            alt="Prangon" 
            className="h-8 object-contain"
          />
        </Link>
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
