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
  Copy,
  Flag,
  Ban,
  Share2,
  Link2,
  UserX,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProfileActionsMenuProps {
  userId: string;
  username: string;
  onMessageClick?: () => void;
}

export const ProfileActionsMenu = ({ userId, username, onMessageClick }: ProfileActionsMenuProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        // User cancelled or error
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onMessageClick && (
            <DropdownMenuItem onClick={onMessageClick}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Message
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBlock} className="text-destructive">
            <Ban className="h-4 w-4 mr-2" />
            Block User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="text-destructive">
            <Flag className="h-4 w-4 mr-2" />
            Report User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
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
