import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MoreVertical, Shield, UserMinus, ChevronDown, Upload, Loader2, Save } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";

interface CircleAdminDialogProps {
  circle: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CircleAdminDialog = ({ circle, open, onOpenChange }: CircleAdminDialogProps) => {
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [name, setName] = useState(circle.name || "");
  const [description, setDescription] = useState(circle.description || "");
  const [privacy, setPrivacy] = useState(circle.privacy || "public");
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"logo" | "banner">("logo");

  const { data: members } = useQuery({
    queryKey: ["circle-members", circle.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("community_group_members")
        .select("*")
        .eq("group_id", circle.id);
      if (!memberRows || memberRows.length === 0) return [];
      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url, display_name, username")
        .in("id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p; });
      return memberRows.map((m: any) => ({ ...m, profiles: profileMap[m.user_id] || null }));
    },
    enabled: open,
  });

  const handleSaveDetails = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("community_groups")
      .update({ name, description, privacy })
      .eq("id", circle.id);
    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["circle-detail", circle.id] });
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      toast({ title: "Circle updated!" });
    }
    setSaving(false);
  };

  const handleRoleChange = async (memberId: string, memberUserId: string, newRole: string) => {
    await supabase.from("community_group_members").update({ role: newRole }).eq("id", memberId);
    // Notify the member
    if (memberUserId) {
      await supabase.rpc("create_notification", {
        p_user_id: memberUserId,
        p_from_user_id: circle.created_by,
        p_type: "circle_role",
        p_title: "Role updated",
        p_message: `Your role in "${circle.name}" was changed to ${newRole}`,
        p_action_url: `/circles`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
    toast({ title: `Role updated to ${newRole}` });
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    await supabase.from("community_group_members").delete().eq("id", memberId);
    // Notify the removed member
    if (memberUserId) {
      await supabase.rpc("create_notification", {
        p_user_id: memberUserId,
        p_from_user_id: circle.created_by,
        p_type: "circle_remove",
        p_title: "Removed from circle",
        p_message: `You were removed from "${circle.name}"`,
        p_action_url: `/circles`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
    toast({ title: "Member removed" });
  };

  const handleFileSelect = (file: File, type: "logo" | "banner") => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropType(type);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    const type = cropType;
    const setter = type === "logo" ? setUploadingLogo : setUploadingBanner;
    setter(true);
    try {
      const ext = "jpg";
      const path = `${circle.id}/${type}-${Date.now()}.${ext}`;
      const bucket = type === "logo" ? "avatars" : "banners";
      const { error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
      if (error) throw error;
      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      const updateField = type === "logo" ? { logo_url: url } : { banner_url: url };
      await supabase.from("community_groups").update(updateField).eq("id", circle.id);
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      queryClient.invalidateQueries({ queryKey: ["circle-detail", circle.id] });
      toast({ title: `${type === "logo" ? "Logo" : "Banner"} updated!` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setter(false);
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "bg-destructive/10 text-destructive border-destructive/20";
    if (role === "moderator") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-semibold">Manage Circle</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-2 grid grid-cols-3 h-9">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs">Branding</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 overflow-auto mt-0">
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Circle Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-sm resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Circle Type</label>
                  <Select value={privacy} onValueChange={setPrivacy}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public"><span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Public — Anyone can see posts</span></SelectItem>
                      <SelectItem value="private"><span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Private — Only members can see posts</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleSaveDetails} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-[50vh] px-4 py-3">
                <p className="text-xs text-muted-foreground mb-3">{members?.length || 0} members</p>
                <div className="space-y-1.5">
                  {members?.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.profiles?.display_name || m.profiles?.username}</p>
                        <p className="text-[10px] text-muted-foreground">@{m.profiles?.username}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${roleColor(m.role)}`}>
                        {m.role}
                      </Badge>
                      {m.user_id !== circle.created_by && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-full hover:bg-muted">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {m.role !== "moderator" && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, m.user_id, "moderator")}>
                                <Shield className="h-3.5 w-3.5 mr-2" /> Promote to Mod
                              </DropdownMenuItem>
                            )}
                            {m.role === "moderator" && (
                              <DropdownMenuItem onClick={() => handleRoleChange(m.id, m.user_id, "member")}>
                                <ChevronDown className="h-3.5 w-3.5 mr-2" /> Demote to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleRemoveMember(m.id, m.user_id)} className="text-destructive">
                              <UserMinus className="h-3.5 w-3.5 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="flex-1 overflow-auto mt-0">
              <div className="px-4 py-4 space-y-5">
                {/* Logo */}
                <div>
                  <p className="text-sm font-medium mb-2">Circle Logo</p>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={circle.logo_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                        {circle.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => logoRef.current?.click()}
                      disabled={uploadingLogo}
                      className="text-xs"
                    >
                      {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Upload Logo
                    </Button>
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f, "logo");
                  }} />
                </div>

                {/* Banner */}
                <div>
                  <p className="text-sm font-medium mb-2">Circle Banner</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-muted h-28 relative">
                    {circle.banner_url ? (
                      <img src={circle.banner_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15" />
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bannerRef.current?.click()}
                    disabled={uploadingBanner}
                    className="text-xs mt-2"
                  >
                    {uploadingBanner ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                    Upload Banner
                  </Button>
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f, "banner");
                  }} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      {cropSrc && (
        <ImageCropDialog
          open={!!cropSrc}
          onOpenChange={(v) => { if (!v) setCropSrc(null); }}
          imageSrc={cropSrc}
          aspectRatio={cropType === "banner" ? 3 : 1}
          shape={cropType === "logo" ? "round" : "rect"}
          onCropComplete={handleCroppedUpload}
        />
      )}
    </>
  );
};
