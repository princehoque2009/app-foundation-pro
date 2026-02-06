import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  BadgeCheck,
  Bell,
  Settings,
  Shield,
  Search,
  Menu,
  X,
  ChevronRight,
  Activity,
  DollarSign,
  Wallet,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "messenger", label: "Messenger Control", icon: MessageSquare },
  { id: "reports", label: "Content & Reports", icon: FileText },
  { id: "verification", label: "Verification", icon: BadgeCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "advertisements", label: "Advertisements", icon: Activity },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "wallet", label: "Wallet Requests", icon: Wallet },
  { id: "settings", label: "App Settings", icon: Settings },
  { id: "logs", label: "Logs & Security", icon: Activity },
];

export const AdminLayout = ({ children, activeSection, onSectionChange }: AdminLayoutProps) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
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

  const { data: stats } = useQuery({
    queryKey: ["admin-quick-stats"],
    queryFn: async () => {
      const [
        { count: pendingReports },
        { count: pendingVerifications },
        { count: openTickets },
      ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        pendingReports: pendingReports || 0,
        pendingVerifications: pendingVerifications || 0,
        openTickets: openTickets || 0,
      };
    },
  });

  const getBadgeCount = (id: string) => {
    if (id === "reports") return stats?.pendingReports || 0;
    if (id === "verification") return stats?.pendingVerifications || 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Admin</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-2 space-y-1">
            {sidebarItems.map((item) => {
              const badgeCount = getBadgeCount(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
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
                      {badgeCount > 0 && (
                        <Badge className="bg-destructive text-destructive-foreground text-xs">
                          {badgeCount}
                        </Badge>
                      )}
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        activeSection === item.id && "rotate-90"
                      )} />
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Admin Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.display_name || profile?.username}</p>
                <Badge variant="outline" className="text-xs">Admin</Badge>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold capitalize">
                {sidebarItems.find(i => i.id === activeSection)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Link to="/">
                <Button variant="outline" size="sm">
                  Exit Admin
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
