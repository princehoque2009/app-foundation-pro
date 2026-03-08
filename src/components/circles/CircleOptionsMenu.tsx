import { useState } from "react";
import { MoreVertical, LogOut, Flag, Share2, BellOff, Trash2, Edit, Users, Pin, Megaphone, Image } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface CircleOptionsMenuProps {
  circle: any;
  userId?: string;
  isAdmin: boolean;
  isMember: boolean;
  onOpenAdmin: () => void;
  onBack: () => void;
}

export const CircleOptionsMenu = ({ circle, userId, isAdmin, isMember, onOpenAdmin, onBack }: CircleOptionsMenuProps) => {
  const queryClient = useQueryClient();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLeave = async () => {
    if (!userId) return;
    setSubmitting(true);
    await supabase.from("community_group_members").delete().eq("group_id", circle.id).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
    queryClient.invalidateQueries({ queryKey: ["circles"] });
    toast({ title: "You left this circle" });
    setShowLeaveConfirm(false);
    setSubmitting(false);
    onBack();
  };

  const handleDelete = async () => {
    if (!userId) return;
    setSubmitting(true);
    // Delete posts, members, then circle
    await supabase.from("community_group_posts").delete().eq("group_id", circle.id);
    await supabase.from("community_group_members").delete().eq("group_id", circle.id);
    await supabase.from("community_groups").delete().eq("id", circle.id);
    queryClient.invalidateQueries({ queryKey: ["circles"] });
    toast({ title: "Circle deleted" });
    setShowDeleteConfirm(false);
    setSubmitting(false);
    onBack();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/circles/${circle.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: circle.name, text: circle.description || `Join ${circle.name} on Prangon!`, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const handleReport = async () => {
    if (!userId || !reportText.trim()) return;
    setSubmitting(true);
    await supabase.from("reports").insert({
      reporter_id: userId,
      report_type: "circle",
      description: reportText,
      reported_user_id: circle.created_by,
    });
    toast({ title: "Report submitted" });
    setShowReport(false);
    setReportText("");
    setSubmitting(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2.5 rounded-full bg-black/40 text-white backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Admin options */}
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={onOpenAdmin} className="gap-2 text-sm">
                <Edit className="h-4 w-4" /> Edit Circle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAdmin} className="gap-2 text-sm">
                <Users className="h-4 w-4" /> Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAdmin} className="gap-2 text-sm">
                <Image className="h-4 w-4" /> Change Banner & Logo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="gap-2 text-sm text-destructive">
                <Trash2 className="h-4 w-4" /> Delete Circle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Member options */}
          <DropdownMenuItem onClick={handleShare} className="gap-2 text-sm">
            <Share2 className="h-4 w-4" /> Share Circle
          </DropdownMenuItem>

          {isMember && !isAdmin && (
            <>
              <DropdownMenuItem onClick={() => setShowLeaveConfirm(true)} className="gap-2 text-sm text-destructive">
                <LogOut className="h-4 w-4" /> Leave Circle
              </DropdownMenuItem>
            </>
          )}

          {!isAdmin && (
            <DropdownMenuItem onClick={() => setShowReport(true)} className="gap-2 text-sm">
              <Flag className="h-4 w-4" /> Report Circle
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Leave Circle?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to leave <strong>{circle.name}</strong>? You'll no longer see posts from this circle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm">
              {submitting ? "Leaving..." : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Circle?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure? This action <strong>cannot be undone</strong>. All posts, members, and media will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm">
              {submitting ? "Deleting..." : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Report Circle</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <Button onClick={handleReport} disabled={submitting || !reportText.trim()} size="sm" className="w-full">
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
