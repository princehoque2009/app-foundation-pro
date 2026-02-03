import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { motion } from "framer-motion";
import {
  Ban,
  Clock,
  AlertTriangle,
  MessageSquare,
  LogOut,
  HelpCircle,
  ChevronRight,
  Shield,
  Send,
} from "lucide-react";
import prangonLogo from "@/assets/prangon-logo.png";

const SuspendedAccount = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [appealText, setAppealText] = useState("");
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch user's suspension info
  const { data: profile, isLoading } = useQuery({
    queryKey: ["suspended-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if there's already a pending appeal
  const { data: existingAppeal } = useQuery({
    queryKey: ["suspension-appeal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .eq("category", "account")
        .ilike("subject", "%suspension appeal%")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0];
    },
    enabled: !!user?.id,
  });

  // Countdown timer
  useEffect(() => {
    if (!profile?.suspended_until) return;

    const endTime = new Date(profile.suspended_until).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Suspension expired, redirect to home
        navigate("/");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [profile?.suspended_until, navigate]);

  // Redirect if not suspended
  useEffect(() => {
    if (!isLoading && profile && !profile.is_suspended) {
      navigate("/");
    }
  }, [profile, isLoading, navigate]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) {
      toast({ title: "Please provide a reason for your appeal", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user?.id,
        subject: "Suspension Appeal Request",
        description: appealText,
        category: "account",
        status: "open",
      });

      if (error) throw error;

      setAppealSubmitted(true);
      toast({ title: "Appeal submitted", description: "Our team will review your request." });
    } catch (error) {
      toast({ title: "Failed to submit appeal", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isPermanent = !profile?.suspended_until;

  return (
    <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <img src={prangonLogo} alt="Prangon" className="h-8" />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg"
        >
          <Card className="border-destructive/20">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto p-4 rounded-full bg-destructive/10 mb-4"
              >
                <Ban className="h-12 w-12 text-destructive" />
              </motion.div>
              <CardTitle className="text-2xl">Account Suspended</CardTitle>
              <CardDescription>
                Your account has been temporarily restricted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Suspension Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-4">
                {/* Countdown Timer */}
                {!isPermanent && timeRemaining !== null && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                    <motion.div
                      className="text-3xl font-bold text-destructive font-mono"
                      key={timeRemaining}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                    >
                      {formatTime(timeRemaining)}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ends {format(new Date(profile?.suspended_until || ""), "PPP 'at' p")}
                    </p>
                  </div>
                )}

                {isPermanent && (
                  <div className="text-center">
                    <Badge variant="destructive" className="text-sm px-4 py-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Indefinite Suspension
                    </Badge>
                  </div>
                )}

                {/* Reason */}
                {profile?.suspension_reason && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-1">Reason</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.suspension_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* What you can't do */}
              <div>
                <p className="text-sm font-medium mb-3">During suspension you cannot:</p>
                <div className="space-y-2">
                  {[
                    "Post new content or stories",
                    "Send messages to other users",
                    "Comment or react to posts",
                    "Join or create groups",
                  ].map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Appeal Section */}
              {!appealSubmitted && !existingAppeal ? (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Submit an Appeal
                  </p>
                  <Textarea
                    placeholder="Explain why you believe this suspension should be lifted..."
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {appealText.length}/500 characters
                    </span>
                    <Button onClick={handleSubmitAppeal} disabled={!appealText.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Appeal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-medium text-sm">Appeal Submitted</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Our team will review your request and get back to you.
                  </p>
                  {existingAppeal && (
                    <Badge variant="outline" className="mt-3">
                      Status: {existingAppeal.status}
                    </Badge>
                  )}
                </div>
              )}

              {/* Help Link */}
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground"
                onClick={() => navigate("/community-standards")}
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Read our Community Standards
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SuspendedAccount;
