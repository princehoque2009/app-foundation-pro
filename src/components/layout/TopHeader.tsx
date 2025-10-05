import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";

export const TopHeader = () => {
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
            to="/notifications"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
