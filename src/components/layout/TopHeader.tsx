import { Search, Bell, LogOut, Users, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

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
    <header className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-lg bg-opacity-90">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover-scale">
          Prangon
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/search"
            className="text-muted-foreground hover:text-primary transition-colors hover-scale"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/friends"
            className="text-muted-foreground hover:text-primary transition-colors hover-scale"
          >
            <Users className="h-5 w-5" />
          </Link>
          <Link
            to="/messages"
            className="text-muted-foreground hover:text-primary transition-colors hover-scale"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link
            to="/notifications"
            className="relative text-muted-foreground hover:text-primary transition-colors hover-scale"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-primary hover-scale"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
