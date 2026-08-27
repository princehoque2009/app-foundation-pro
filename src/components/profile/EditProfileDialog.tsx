import React, { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UserCircle, Camera, Image as ImageIcon, MapPin, Loader2, Trash2 } from "lucide-react";
import { countries, getCountryFlag } from "@/lib/countries";
import { ImageCropDialog } from "@/components/circles/ImageCropDialog";
import { validateFileUpload } from "@/lib/validation";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { SocialLinksMap } from "./SocialLinks";

interface EditProfileDialogProps {
  profile: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileDialog = ({ profile, open, onOpenChange }: EditProfileDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [profileTheme, setProfileTheme] = useState<'default' | 'yellow' | 'mono'>((profile as any)?.profile_theme || 'default');
  const isVerified = !!profile?.is_verified;

  React.useEffect(() => {
    if ((profile as any)?.profile_theme) setProfileTheme((profile as any).profile_theme);
  }, [profile?.id, (profile as any)?.profile_theme]);

  const [socialLinks, setSocialLinks] = useState<SocialLinksMap>(
    (profile?.social_links && typeof profile.social_links === "object") ? profile.social_links : {}
  );

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [showBannerMenu, setShowBannerMenu] = useState(false);

  const currentAvatarUrl = avatarPreview || profile?.avatar_url || "";
  const currentBannerUrl = removeBanner ? null : (bannerPreview || profile?.cover_photo_url);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = profile?.avatar_url;
      let cover_photo_url = profile?.cover_photo_url;

      if (avatarBlob) {
        setAvatarUploading(true);
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("avatars").upload(fileName, avatarBlob, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatar_url = data.publicUrl;
        setAvatarUploading(false);
      }

      if (bannerBlob) {
        if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");
        setBannerUploading(true);
        const result = await uploadToCloudinary(bannerBlob, { folder: `prangon/covers/${user?.id}` });
        cover_photo_url = result.secure_url;
        setBannerUploading(false);
      }

      if (removeBanner) cover_photo_url = null;

      const cleanedUsername = username.replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_');
      if (cleanedUsername.length < 3) throw new Error("Username must be at least 3 characters");
      if (!/^[a-z0-9_]+$/.test(cleanedUsername)) throw new Error("Username can only contain letters, numbers and underscore");

      if (cleanedUsername !== profile?.username) {
        const { data: existingUser } = await supabase.from("profiles").select("id").eq("username", cleanedUsername).neq("id", user?.id).maybeSingle();
        if (existingUser) throw new Error("This username is already taken.");
      }

      if (displayName && displayName !== profile?.display_name) {
        const { data: existingName } = await supabase.from("profiles").select("id").eq("display_name", displayName).neq("id", user?.id).maybeSingle();
        if (existingName) throw new Error("This display name is already in use.");
      }

      const updateData: any = {
        display_name: displayName,
        username: cleanedUsername,
        bio,
        country,
        avatar_url,
        cover_photo_url,
        social_links: socialLinks as any,
      };
      if (isVerified) updateData.profile_theme = profileTheme;
      const { error } = await supabase.from("profiles").update(updateData).eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
      toast({ title: "Profile updated!" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const isSaving = updateProfileMutation.isPending || avatarUploading || bannerUploading;

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFileUpload(file, { maxSizeMB: 5, allowedTypes: ["image/jpeg", "image/png", "image/webp"] });
    if (!validation.valid) { toast({ title: validation.error, variant: "destructive" }); return; }
    setAvatarCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleAvatarCropComplete = useCallback((blob: Blob) => {
    setAvatarBlob(blob);
    setAvatarCropSrc(null);
    setAvatarPreview(URL.createObjectURL(blob));
  }, []);

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFileUpload(file, { maxSizeMB: 10, allowedTypes: ["image/jpeg", "image/png", "image/webp"] });
    if (!validation.valid) { toast({ title: validation.error, variant: "destructive" }); return; }
    setBannerCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleBannerCropComplete = useCallback((blob: Blob) => {
    setBannerBlob(blob);
    setBannerCropSrc(null);
    setBannerPreview(URL.createObjectURL(blob));
    setRemoveBanner(false);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 rounded-[24px]">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] px-6">
            <div className="space-y-6 pb-6">
              <div>
                <Label>Banner</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Recommended: 1500×500px</p>
                <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-muted border">
                  {currentBannerUrl ? <img src={currentBannerUrl} alt="Banner" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No banner</div>}
                  {bannerUploading && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => bannerFileRef.current?.click()} disabled={isSaving}><ImageIcon className="h-3.5 w-3.5" />Gallery</Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => { setRemoveBanner(true); setBannerPreview(null); setBannerBlob(null); }} disabled={isSaving}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
                </div>
                <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileSelect} />
              </div>

              <div>
                <Label>Avatar</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Avatar className="h-20 w-20"><AvatarImage src={currentAvatarUrl} /><AvatarFallback><UserCircle className="h-10 w-10" /></AvatarFallback></Avatar>
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarFileRef.current?.click()} disabled={isSaving}><Camera className="h-4 w-4 mr-2" />Change</Button>
                </div>
                <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
              </div>

              <div className="space-y-4">
                <div><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" /></div>
                <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" /></div>
                <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell about yourself" rows={3} /></div>
                <div><Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{countries.map((c) => (<SelectItem key={c.code} value={c.name}><span className="flex items-center gap-2">{getCountryFlag(c.code)} {c.name}</span></SelectItem>))}</SelectContent></Select>
                </div>
                {isVerified && (
                  <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/15 dark:to-orange-950/10 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">👑</div>
                      <div><div className="text-sm font-semibold">Verified Exclusive Themes</div><div className="text-[11px] text-muted-foreground">Only verified accounts can use these</div></div>
                      <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold">VERIFIED ONLY</span>
                    </div>
                    <div className="rounded-[14px] bg-background/80 border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium">Live Preview</span>
                        {profileTheme !== 'default' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">{profileTheme}</span>}
                      </div>
                      <div className={"rounded-xl overflow-hidden border transition-all " + (profileTheme === 'yellow' ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50" : profileTheme === 'mono' ? "border-zinc-300 bg-gradient-to-br from-zinc-50 to-white" : "border-border bg-muted/30")}>
                        <div className={"h-[68px] w-full relative " + (profileTheme === 'yellow' ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50" : profileTheme === 'mono' ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-muted")}>
                          <div className="absolute -bottom-6 left-4 flex items-end gap-3">
                            <div className={"rounded-full bg-background p-0.5 shadow-md " + (profileTheme === 'yellow' ? "ring-2 ring-amber-400" : profileTheme === 'mono' ? "ring-2 ring-background shadow-[0_0_0_3px_hsl(var(--foreground))]" : "ring-2 ring-background")}>
                              <div className="h-12 w-12 rounded-full bg-muted" />
                            </div>
                            <div className={"text-[14px] font-bold " + (profileTheme === 'yellow' ? "bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent" : "text-foreground")}>{displayName || "Your Name"}</div>
                          </div>
                        </div>
                        <div className="pt-8 pb-3 px-4" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          { id: 'default', label: 'Default', sub: 'Normal' },
                          { id: 'yellow', label: 'Gold', sub: 'Premium' },
                          { id: 'mono', label: 'Mono', sub: 'B&W' },
                        ].map((t) => (
                          <button key={t.id} type="button" onClick={() => setProfileTheme(t.id as any)} className={"relative rounded-xl border p-3 text-left transition-all " + (profileTheme === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50")}>
                            <div className="text-xs font-medium">{t.label}</div>
                            <div className="text-[10px] text-muted-foreground">{t.sub}</div>
                            {profileTheme === t.id && <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">✓</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
              </div>
            </div>
          </ScrollArea>
          <div className="p-6 pt-3 flex justify-end gap-2 border-t"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button><Button onClick={() => updateProfileMutation.mutate()} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button></div>
        </DialogContent>
      </Dialog>
      {avatarCropSrc && <ImageCropDialog open={!!avatarCropSrc} onOpenChange={(o) => !o && setAvatarCropSrc(null)} imageSrc={avatarCropSrc} onCropComplete={handleAvatarCropComplete} aspectRatio={1} />}
      {bannerCropSrc && <ImageCropDialog open={!!bannerCropSrc} onOpenChange={(o) => !o && setBannerCropSrc(null)} imageSrc={bannerCropSrc} onCropComplete={handleBannerCropComplete} aspectRatio={3} />}
    </>
  );
};

