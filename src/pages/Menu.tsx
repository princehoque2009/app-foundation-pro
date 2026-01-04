import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Star,
  Bookmark,
  Bell,
  MessageCircle,
  User,
  Users,
  Film,
  Clock,
  FileText,
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  UserCircle,
  ArrowLeft,
  Megaphone,
  Headphones,
  BarChart3,
  Flag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useRoles } from "@/contexts/RolesContext";

const menuItems = [
  {
    id: "favourites",
    icon: Star,
    label: "Favourites",
    description: "Your saved posts",
    path: "/favourites",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "groups",
    icon: Users,
    label: "Groups",
    description: "Your group chats",
    path: "/groups",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    description: "Manage your alerts",
    path: "/notifications",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "messages",
    icon: MessageCircle,
    label: "Messages",
    description: "Your conversations",
    path: "/messages",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "profile",
    icon: User,
    label: "My Profile",
    description: "View and edit your profile",
    path: "/profile",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "reels",
    icon: Film,
    label: "Reels & Shorts",
    description: "Watch and create short videos",
    path: "/reels",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    id: "friends",
    icon: UserCircle,
    label: "Friends",
    description: "Manage your connections",
    path: "/friends",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "activity",
    icon: Clock,
    label: "Activity Log",
    description: "Your recent activity",
    path: "/notifications",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

const settingsItems = [
  {
    id: "help",
    icon: HelpCircle,
    label: "Help & Support",
    path: "/help",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings & Privacy",
    path: "/settings",
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
        className="p-4 space-y-6 max-w-screen-xl mx-auto"
      >
        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-md"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <UserCircle className="h-8 w-8" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate flex items-center gap-2">
                  {profile?.display_name || profile?.username || "User"}
                  {profile?.is_verified && <VerifiedBadge size="md" />}
                </h2>
                <p className="text-muted-foreground text-sm truncate">
                  @{profile?.username}
                </p>
                <p className="text-primary text-sm font-medium mt-1">
                  View your profile
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>

        {/* Main Menu Items */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <Card
                key={item.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-all hover:-translate-y-0.5 border-0 shadow-sm"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.label}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Theme Toggle */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm">Dark Mode</h3>
                  <p className="text-xs text-muted-foreground">
                    {theme === "dark" ? "Currently on" : "Currently off"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          </Card>
        </motion.div>

        {/* Settings Section */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-sm">
            {/* Role-based panel links */}
            {isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                onClick={() => navigate("/admin")}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm text-primary">Admin Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isSupport && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                onClick={() => navigate("/support-panel")}
              >
                <div className="flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-sm text-green-600">Support Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isModerator && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                onClick={() => navigate("/moderator-panel")}
              >
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-sm text-orange-600">Moderator Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {isAdvisor && !isAdmin && (
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border"
                onClick={() => navigate("/advisor-panel")}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-sm text-blue-600">Advisor Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {settingsItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  index !== settingsItems.length - 1 ? "border-b border-border" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
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
            className="p-4 cursor-pointer hover:bg-destructive/10 transition-colors border-0 shadow-sm"
            onClick={handleSignOut}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-destructive">Log Out</h3>
                <p className="text-xs text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* App Version */}
        <motion.div variants={itemVariants} className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Prangon v1.2.0</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Menu;
