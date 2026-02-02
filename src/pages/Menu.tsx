import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getVersionInfo } from "@/lib/version";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Bookmark,
  Bell,
  MessageCircle,
  User,
  Users,
  Film,
  Clock,
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  UserCircle,
  ArrowLeft,
  Headphones,
  BarChart3,
  Flag,
  Share2,
  Link2,
  MessageSquare,
  Info,
  Scale,
  Cookie,
  BookOpen,
  Building2,
  Heart,
  Globe,
  Lock,
  Palette,
  Zap,
  Radio,
  History,
  Star,
  CircleUser,
  Wallet,
  Gift,
  ShieldCheck,
  FileText,
  Smartphone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useRoles } from "@/contexts/RolesContext";

// Minimal B&W outline icons - consistent style
const menuItems = [
  {
    id: "groups",
    icon: Users,
    label: "Groups",
    description: "Your group chats",
    path: "/groups",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    description: "Manage your alerts",
    path: "/notifications",
  },
  {
    id: "messages",
    icon: MessageCircle,
    label: "Messages",
    description: "Your conversations",
    path: "/messages",
  },
  {
    id: "profile",
    icon: User,
    label: "My Profile",
    description: "View and edit profile",
    path: "/profile",
  },
  {
    id: "reels",
    icon: Film,
    label: "Reels",
    description: "Watch short videos",
    path: "/reels",
  },
  {
    id: "friends",
    icon: Heart,
    label: "Friends",
    description: "Manage connections",
    path: "/friends",
  },
  {
    id: "live",
    icon: Radio,
    label: "Live",
    description: "Go live or watch",
    path: "/live",
  },
];

const quickAccessItems = [
  {
    id: "activity",
    icon: History,
    label: "Activity Log",
    path: "/notifications",
  },
  {
    id: "memories",
    icon: Clock,
    label: "Memories",
    path: "/notifications",
  },
  {
    id: "starred",
    icon: Star,
    label: "Starred",
    path: "/favourites",
  },
  {
    id: "gaming",
    icon: Zap,
    label: "Gaming",
    path: "/",
  },
];

const settingsItems = [
  {
    id: "settings",
    icon: Settings,
    label: "Settings & Privacy",
    path: "/settings",
  },
  {
    id: "help",
    icon: HelpCircle,
    label: "Help & Support",
    path: "/help",
  },
  {
    id: "accessibility",
    icon: CircleUser,
    label: "Accessibility",
    path: "/settings",
  },
];

const legalItems = [
  {
    id: "community",
    icon: Scale,
    label: "Community Standards",
    path: "/community-standards",
  },
  {
    id: "cookies",
    icon: Cookie,
    label: "Cookies Policy",
    path: "/cookies-policy",
  },
  {
    id: "privacy",
    icon: BookOpen,
    label: "Manage Your Information",
    path: "/manage-info",
  },
  {
    id: "about",
    icon: Building2,
    label: "About Prangon",
    path: "/about",
  },
];

const Menu = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copied!",
        description: "Profile link copied to clipboard.",
      });
    }
  };

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id}`;
    await navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Link copied!",
      description: "Profile link copied to clipboard.",
    });
  };

  const handleFeedback = () => {
    navigate("/help");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg">Menu</h1>
          <div className="w-9" />
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 space-y-5 max-w-screen-xl mx-auto"
      >
        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-border/50"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-border">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <UserCircle className="h-7 w-7" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate flex items-center gap-2">
                  {profile?.display_name || profile?.username || "User"}
                  {profile?.is_verified && <VerifiedBadge size="md" />}
                </h2>
                <p className="text-muted-foreground text-sm truncate">
                  @{profile?.username}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions - Minimal style */}
        <motion.div variants={itemVariants}>
          <Card className="p-2 border-border/50">
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={handleShareProfile}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Share2 className="h-5 w-5 text-foreground" />
                <span className="text-xs text-muted-foreground">Share</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Link2 className="h-5 w-5 text-foreground" />
                <span className="text-xs text-muted-foreground">Copy</span>
              </button>
              <button
                onClick={handleFeedback}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-foreground" />
                <span className="text-xs text-muted-foreground">Feedback</span>
              </button>
              <button
                onClick={() => navigate("/about")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Info className="h-5 w-5 text-foreground" />
                <span className="text-xs text-muted-foreground">About</span>
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Main Menu Items - Minimal B&W Icons */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-2">
            {menuItems.map((item) => (
              <Card
                key={item.id}
                className="p-3.5 cursor-pointer hover:bg-muted/50 transition-all hover:-translate-y-0.5 border-border/50"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted">
                    <item.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.label}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Quick Access */}
        <motion.div variants={itemVariants}>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Quick Access
          </h3>
          <Card className="overflow-hidden border-border/50">
            {quickAccessItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index !== quickAccessItems.length - 1 ? "border-b border-border/50" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </Card>
        </motion.div>


        {/* Settings Section */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-border/50">
            {/* Role-based panel links */}
            {isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                onClick={() => navigate("/admin")}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">Admin Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isSupport && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                onClick={() => navigate("/support-panel")}
              >
                <div className="flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">Support Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isModerator && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                onClick={() => navigate("/moderator-panel")}
              >
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">Moderator Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isAdvisor && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                onClick={() => navigate("/advisor-panel")}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">Advisor Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {settingsItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index !== settingsItems.length - 1 ? "border-b border-border/50" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </Card>
        </motion.div>

        {/* Legal & Info Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Legal & Information
          </h3>
          <Card className="overflow-hidden border-border/50">
            {legalItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index !== legalItems.length - 1 ? "border-b border-border/50" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div variants={itemVariants}>
          <Card
            className="p-4 cursor-pointer hover:bg-destructive/10 transition-colors border-border/50"
            onClick={handleSignOut}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-destructive">Log Out</h3>
                <p className="text-[11px] text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* App Version */}
        <motion.div variants={itemVariants} className="text-center pt-2 pb-4">
          <p className="text-xs text-muted-foreground">{getVersionInfo().fullVersion}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {getVersionInfo().copyright}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Menu;
