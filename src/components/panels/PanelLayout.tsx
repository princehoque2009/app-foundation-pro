import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Menu,
  X,
  ChevronRight,
  Bell,
  ArrowLeft,
  Moon,
  Sun,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface PanelSidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
}

interface PanelLayoutProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  sidebarItems: PanelSidebarItem[];
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  roleBadge: string;
  roleColor?: string;
  quickStats?: { pending: number; active: number };
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export const PanelLayout = ({
  children,
  activeSection,
  onSectionChange,
  sidebarItems,
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  roleBadge,
  roleColor = "bg-primary/10 text-primary",
  quickStats,
  onSearch,
  searchPlaceholder = "Search...",
}: PanelLayoutProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["panel-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Icon className={cn("h-6 w-6", iconColor)} />
            <span className="font-semibold text-lg">{title}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSidebarOpen(!sidebarOpen);
            setSidebarMobileOpen(false);
          }}
          className="shrink-0 hidden lg:flex"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarMobileOpen(false)}
          className="shrink-0 lg:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="p-2 space-y-1">
          <TooltipProvider delayDuration={0}>
            {sidebarItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      onSectionChange(item.id);
                      setSidebarMobileOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      "hover:bg-muted/50",
                      activeSection === item.id && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge
                            variant={item.badgeVariant || "destructive"}
                            className="text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            activeSection === item.id && "rotate-90"
                          )}
                        />
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <div className="flex items-center gap-2">
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant={item.badgeVariant || "destructive"} className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
        <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.display_name || profile?.username}
              </p>
              <Badge variant="outline" className={cn("text-xs", roleColor)}>
                {roleBadge}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 hidden lg:block",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border transition-transform duration-300 lg:hidden",
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          "lg:ml-64",
          !sidebarOpen && "lg:ml-16"
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarMobileOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Back button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hidden lg:flex"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-lg lg:text-xl font-semibold capitalize">
                  {sidebarItems.find((i) => i.id === activeSection)?.label || title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground hidden lg:block">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              {/* Search */}
              {onSearch && (
                <form onSubmit={handleSearch} className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 lg:w-64"
                  />
                </form>
              )}

              {/* Quick Stats */}
              {quickStats && (
                <div className="hidden lg:flex items-center gap-3">
                  {quickStats.pending > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <Bell className="h-3 w-3" />
                      {quickStats.pending} pending
                    </Badge>
                  )}
                </div>
              )}

              {/* Exit */}
              <Link to="/">
                <Button variant="outline" size="sm">
                  Exit {roleBadge}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
};
