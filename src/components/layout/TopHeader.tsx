import { Search, Bell, LogOut, Users, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import prangonLogo from "@/assets/prangon-logo.png";

export const TopHeader = () => {
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <Link to="/" className="flex items-center gap-2 hover-scale">
          <img 
            src={prangonLogo} 
            alt="Prangon" 
            className="h-8 object-contain"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all hover-scale"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/friends"
            className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all hover-scale"
          >
            <Users className="h-5 w-5" />
          </Link>
          <Link
            to="/messages"
            className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all hover-scale"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link
            to="/notifications"
            className="relative p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all hover-scale"
          >
            <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bell-shake' : ''}`} />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground border-2 border-background animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full hover-scale"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
