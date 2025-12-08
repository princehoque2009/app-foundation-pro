import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Users, Upload, Search, UserCircle, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateGroupDialog = ({ open, onOpenChange }: CreateGroupDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<"details" | "members">("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch friends
  const { data: friends } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map((f) => f.friend) || [];
    },
    enabled: !!user?.id && open,
  });

  const filteredFriends = friends?.filter((f: any) =>
    f?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = null;

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `group-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-media")
          .getPublicUrl(fileName);

        avatar_url = publicUrl;
      }

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("chat_groups")
        .insert({
          name,
          description,
          avatar_url,
          created_by: user?.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: adminError } = await supabase
        .from("chat_group_members")
        .insert({
          group_id: group.id,
          user_id: user?.id,
          role: "admin",
        });

      if (adminError) throw adminError;

      // Add selected members
      if (selectedMembers.length > 0) {
        const memberInserts = selectedMembers.map((memberId) => ({
          group_id: group.id,
          user_id: memberId,
          role: "member",
        }));

        const { error: membersError } = await supabase
          .from("chat_group_members")
          .insert(memberInserts);

        if (membersError) throw membersError;
      }

      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      toast({ title: "Group created!", description: `${name} is ready to use` });
      resetForm();
      onOpenChange(false);
      navigate(`/groups/${group.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const resetForm = () => {
    setStep("details");
    setName("");
    setDescription("");
    setAvatarFile(null);
    setPreviewUrl("");
    setSelectedMembers([]);
    setSearchQuery("");
  };

  const canProceed = name.trim().length >= 2;
  const canCreate = canProceed;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold">
            {step === "details" ? "Create Group" : "Add Members"}
          </DialogTitle>
        </DialogHeader>

        {step === "details" ? (
          <div className="p-6 space-y-6">
            {/* Group Avatar */}
            <div className="flex flex-col items-center">
              <label className="cursor-pointer group">
                <Avatar className="h-24 w-24 rounded-2xl">
                  {previewUrl ? (
                    <AvatarImage src={previewUrl} />
                  ) : (
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                      <Users className="h-10 w-10" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center mt-2">
                  <span className="text-sm text-primary font-medium group-hover:underline">
                    Add Photo
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                className="bg-muted border-0"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                className="bg-muted border-0 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceed}
                onClick={() => setStep("members")}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted border-0 rounded-full"
                />
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Friends List */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {filteredFriends && filteredFriends.length > 0 ? (
                  filteredFriends.map((friend: any) => {
                    const isSelected = selectedMembers.includes(friend?.id);
                    return (
                      <button
                        key={friend?.id}
                        onClick={() => friend?.id && toggleMember(friend.id)}
                        className={cn(
                          "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={friend?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {friend?.display_name?.[0] || friend?.username?.[0] || (
                              <UserCircle className="h-5 w-5" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <h4 className="font-medium text-sm">
                            {friend?.display_name || friend?.username}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            @{friend?.username}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No friends found" : "Add friends to invite them"}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("details")}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canCreate || createGroupMutation.isPending}
                onClick={() => createGroupMutation.mutate()}
              >
                {createGroupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
