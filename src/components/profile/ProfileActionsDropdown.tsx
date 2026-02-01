import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Link2,
  Flag,
  Ban,
  Share2,
  VolumeX,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileActionsDropdownProps {
  userId: string;
  username: string;
  onMessageClick?: () => void;
}

export const ProfileActionsDropdown = ({ 
  userId, 
  username, 
  onMessageClick 
}: ProfileActionsDropdownProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${userId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({ title: "Profile link copied!" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} on Prangon`,
          text: `Check out @${username}'s profile on Prangon`,
          url: profileUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("blocked_users")
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
        });
      
      if (error) throw error;
      
      toast({ title: "User blocked", description: "You won't see their content anymore" });
      navigate("/");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to block user",
        variant: "destructive" 
      });
    }
  };

  const handleMute = async () => {
    toast({ title: "User muted", description: "Their posts will be hidden from your feed" });
  };

  const handleReport = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          reported_user_id: userId,
          report_type: "user",
          description: reportDescription,
        });
      
      if (error) throw error;
      
      toast({ title: "Report submitted", description: "We'll review this account" });
      setIsReportOpen(false);
      setReportDescription("");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit report",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.id === userId) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-muted"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <AnimatePresence>
          {isOpen && (
            <DropdownMenuContent 
              align="end" 
              className="w-52 bg-popover border-border shadow-lg rounded-xl overflow-hidden"
              asChild
              forceMount
            >
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {onMessageClick && (
                  <DropdownMenuItem 
                    onClick={onMessageClick}
                    className="gap-3 py-2.5 px-3 cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Send Message</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleShare}
                  className="gap-3 py-2.5 px-3 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span>Share Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleCopyLink}
                  className="gap-3 py-2.5 px-3 cursor-pointer"
                >
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-border" />
                
                <DropdownMenuItem 
                  onClick={handleMute}
                  className="gap-3 py-2.5 px-3 cursor-pointer"
                >
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                  <span>Mute User</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleBlock} 
                  className="gap-3 py-2.5 px-3 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Ban className="h-4 w-4" />
                  <span>Block User</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsReportOpen(true)} 
                  className="gap-3 py-2.5 px-3 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Flag className="h-4 w-4" />
                  <span>Report User</span>
                </DropdownMenuItem>
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Report @{username}</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for report</Label>
              <Textarea
                placeholder="Describe why you're reporting this user..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReportOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReport} 
              disabled={!reportDescription.trim() || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
