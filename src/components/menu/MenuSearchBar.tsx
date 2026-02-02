import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  path: string;
  category: string;
}

const SEARCHABLE_ITEMS: SearchItem[] = [
  // Main Menu Items
  { id: "groups", label: "Groups", description: "Your group chats", path: "/groups", category: "Menu" },
  { id: "notifications", label: "Notifications", description: "Manage your alerts", path: "/notifications", category: "Menu" },
  { id: "messages", label: "Messages", description: "Your conversations", path: "/messages", category: "Menu" },
  { id: "profile", label: "My Profile", description: "View and edit profile", path: "/profile", category: "Menu" },
  { id: "reels", label: "Reels", description: "Watch short videos", path: "/reels", category: "Menu" },
  { id: "friends", label: "Friends", description: "Manage connections", path: "/friends", category: "Menu" },
  { id: "live", label: "Live", description: "Go live or watch", path: "/live", category: "Menu" },
  
  // Quick Access
  { id: "activity", label: "Activity Log", path: "/notifications", category: "Quick Access" },
  { id: "memories", label: "Memories", path: "/notifications", category: "Quick Access" },
  { id: "starred", label: "Starred", path: "/favourites", category: "Quick Access" },
  { id: "gaming", label: "Gaming", path: "/", category: "Quick Access" },
  
  // Settings
  { id: "settings", label: "Settings & Privacy", path: "/settings", category: "Settings" },
  { id: "help", label: "Help & Support", path: "/help", category: "Settings" },
  { id: "accessibility", label: "Accessibility", path: "/settings", category: "Settings" },
  { id: "appearance", label: "Appearance", description: "Theme, language, haptics", path: "/settings", category: "Settings" },
  { id: "dark-mode", label: "Dark Mode", path: "/settings", category: "Settings" },
  { id: "language", label: "Language", path: "/settings", category: "Settings" },
  { id: "privacy", label: "Privacy", path: "/settings", category: "Settings" },
  { id: "data-storage", label: "Data & Storage", path: "/settings", category: "Settings" },
  { id: "account", label: "Account Settings", path: "/settings", category: "Settings" },
  
  // Lab
  { id: "lab", label: "Lab", description: "Pages & Groups", path: "/lab", category: "Lab" },
  { id: "pages", label: "Pages", description: "Create and manage pages", path: "/lab", category: "Lab" },
  { id: "community-groups", label: "Community Groups", description: "Create and manage groups", path: "/lab", category: "Lab" },
  { id: "create-page", label: "Create Page", path: "/lab", category: "Lab" },
  { id: "create-group", label: "Create Group", path: "/lab", category: "Lab" },
  
  // Legal
  { id: "community-standards", label: "Community Standards", path: "/community-standards", category: "Legal" },
  { id: "cookies", label: "Cookies Policy", path: "/cookies-policy", category: "Legal" },
  { id: "manage-info", label: "Manage Your Information", path: "/manage-info", category: "Legal" },
  { id: "about", label: "About Prangon", path: "/about", category: "Legal" },
];

interface MenuSearchBarProps {
  onItemSelect?: () => void;
}

export const MenuSearchBar = ({ onItemSelect }: MenuSearchBarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return SEARCHABLE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 8);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    navigate(item.path);
    setQuery("");
    setIsFocused(false);
    onItemSelect?.();
  };

  const showResults = isFocused && filteredItems.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search menu, settings, lab..."
          className="pl-10 pr-10 bg-muted border-0 rounded-full"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background/50"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={cn(
                  "w-full px-4 py-3 text-left flex flex-col hover:bg-muted/50 transition-colors",
                  index !== filteredItems.length - 1 && "border-b border-border/50"
                )}
              >
                <span className="font-medium text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.category}
                  {item.description && ` · ${item.description}`}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
