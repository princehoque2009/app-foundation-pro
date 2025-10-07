import { Search, Bell, LogOut, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export const TopHeader = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <Link to="/" className="text-2xl font-bold text-primary">
          Prangon
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/search"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            to="/friends"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-5 w-5" />
          </Link>
          <Link
            to="/notifications"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
