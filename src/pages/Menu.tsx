import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getVersionInfo } from "@/lib/version";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Bell,
  MessageCircle,
  User,
  Users,
  Film,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  ArrowLeft,
  Headphones,
  BarChart3,
  Flag,
  Heart,
  Radio,
  History,
  Star,
  Zap,
  Wallet,
  Scale,
  Cookie,
  BookOpen,
  Building2,
  Share2,
  Link2,
  MessageSquare,
  Info,
  FlaskConical,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useRoles } from "@/contexts/RolesContext";
import { MenuSearchBar } from "@/components/menu/MenuSearchBar";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
}

const mainMenuItems: MenuItem[] = [
  { id: "messages", icon: MessageCircle, label: "Messages", description: "Your conversations", path: "/messages" },
  { id: "notifications", icon: Bell, label: "Notifications", description: "Manage your alerts", path: "/notifications" },
  { id: "friends", icon: Heart, label: "Friends", description: "Manage connections", path: "/friends" },
  { id: "groups", icon: Users, label: "Groups", description: "Your group chats", path: "/groups" },
  { id: "reels", icon: Film, label: "Reels", description: "Watch short videos", path: "/reels" },
  { id: "live", icon: Radio, label: "Live", description: "Go live or watch", path: "/live" },
  { id: "wallet", icon: Wallet, label: "Wallet", description: "Prangs & transactions", path: "/wallet" },
  { id: "lab", icon: FlaskConical, label: "Lab", description: "Pages & communities", path: "/lab" },
];

const quickAccessItems: MenuItem[] = [
  { id: "activity", icon: History, label: "Activity Log", description: "Your recent activity", path: "/activity-log" },
  { id: "memories", icon: Clock, label: "Memories", description: "On this day", path: "/memories" },
  { id: "starred", icon: Star, label: "Starred", description: "Saved & favourites", path: "/favourites" },
  { id: "gaming", icon: Zap, label: "Gaming", description: "Play games", path: "/gaming" },
];

const settingsItems: MenuItem[] = [
  { id: "settings", icon: Settings, label: "Settings & Privacy", description: "Account, security, preferences", path: "/settings" },
  { id: "help", icon: HelpCircle, label: "Help & Support", description: "Contact, FAQ, guidelines", path: "/help" },
];

const legalItems: MenuItem[] = [
  { id: "community", icon: Scale, label: "Community Standards", description: "Our community rules", path: "/community-standards" },
  { id: "cookies", icon: Cookie, label: "Cookies Policy", description: "How we use cookies", path: "/cookies-policy" },
  { id: "manage-info", icon: BookOpen, label: "Manage Your Information", description: "Data & privacy controls", path: "/manage-info" },
  { id: "about", icon: Building2, label: "About Prangon", description: "Version and app info", path: "/about" },
];

const Menu = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator, isAdvisor, isSupport } = useRoles();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/auth");
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || profile?.username}'s Profile`,
          text: `Check out ${profile?.display_name || profile?.username} on Prangon!`,
          url: profileUrl,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Link copied!", description: "Profile link copied to clipboard." });
    }
  };

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id}`;
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Link copied!", description: "Profile link copied to clipboard." });
  };

  // Build role-based items dynamically
  const roleItems: MenuItem[] = [];
  if (isAdmin) roleItems.push({ id: "admin", icon: Shield, label: "Admin Panel", description: "Manage the platform", path: "/admin" });
  if (isSupport && !isAdmin) roleItems.push({ id: "support", icon: Headphones, label: "Support Panel", description: "Handle support tickets", path: "/support-panel" });
  if (isModerator && !isAdmin) roleItems.push({ id: "moderator", icon: Flag, label: "Moderator Panel", description: "Review reports & content", path: "/moderator-panel" });
  if (isAdvisor && !isAdmin) roleItems.push({ id: "advisor", icon: BarChart3, label: "Advisor Panel", description: "Insights & suggestions", path: "/advisor-panel" });

  const renderMenuRow = (item: MenuItem, index: number, delay: number = 0) => (
    <motion.button
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay + index * 0.03 }}
      onClick={() => navigate(item.path)}
      className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-muted/40 transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/60 group-hover:bg-muted transition-colors">
        <item.icon className="h-5 w-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
    </motion.button>
  );

  const renderSectionLabel = (label: string) => (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3.5 pt-4 pb-1">
      {label}
    </p>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-screen-md mx-auto gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-lg text-foreground">Menu</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-4 py-4 space-y-1">
        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MenuSearchBar />
        </motion.div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card
            className="p-4 mt-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {profile?.username?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate flex items-center gap-2">
                  {profile?.display_name || profile?.username || "User"}
                  {profile?.is_verified && <VerifiedBadge size="md" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="flex items-center justify-around py-3"
        >
          {[
            { icon: Share2, label: "Share", action: handleShareProfile },
            { icon: Link2, label: "Copy Link", action: handleCopyLink },
            { icon: MessageSquare, label: "Feedback", action: () => navigate("/help") },
            { icon: Info, label: "About", action: () => navigate("/about") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Main Menu */}
        {renderSectionLabel("Features")}
        <div className="space-y-0.5">
          {mainMenuItems.map((item, i) => renderMenuRow(item, i, 0.08))}
        </div>

        {/* Quick Access */}
        {renderSectionLabel("Quick Access")}
        <div className="space-y-0.5">
          {quickAccessItems.map((item, i) => renderMenuRow(item, i, 0.3))}
        </div>

        {/* Role-based Panels */}
        {roleItems.length > 0 && (
          <>
            {renderSectionLabel("Panels")}
            <div className="space-y-0.5">
              {roleItems.map((item, i) => renderMenuRow(item, i, 0.42))}
            </div>
          </>
        )}

        {/* Settings & Help */}
        {renderSectionLabel("Settings")}
        <div className="space-y-0.5">
          {settingsItems.map((item, i) => renderMenuRow(item, i, 0.5))}
        </div>

        {/* Legal */}
        {renderSectionLabel("Legal & Information")}
        <div className="space-y-0.5">
          {legalItems.map((item, i) => renderMenuRow(item, i, 0.56))}
        </div>

        {/* Logout */}
        <div className="pt-4">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-destructive/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Log Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
          </motion.button>
        </div>

        {/* Version */}
        <div className="text-center pt-4 pb-4">
          <p className="text-xs text-muted-foreground">{getVersionInfo().fullVersion}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">{getVersionInfo().copyright}</p>
        </div>
      </div>
    </div>
  );
};

export default Menu;
