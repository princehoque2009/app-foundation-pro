import { useState, useRef, useCallback } from "react";
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
import { UserCircle, Camera, Image as ImageIcon, MapPin, Loader2, Trash2, Crown, Palette, Eye, Sparkles } from "lucide-react";
import { countries, getCountryFlag } from "@/lib/countries";
import { ImageCropDialog } from "@/components/circles/ImageCropDialog";
import { validateFileUpload } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { SocialLinksEditor } from "./SocialLinksEditor";
import type { SocialLinksMap } from "./SocialLinks";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

interface EditProfileDialogProps {
  profile: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VerifiedTheme = 'default' | 'yellow' | 'mono';

export const EditProfileDialog = ({ profile, open, onOpenChange }: EditProfileDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [socialLinks, setSocialLinks] = useState<SocialLinksMap>(
    (profile?.social_links && typeof profile.social_links === "object") ? profile.social_links : {}
  );
  const [profileTheme, setProfileTheme] = useState<VerifiedTheme>(profile?.profile_theme || 'default');

  // Avatar state
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Banner state
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const bannerCameraRef = useRef<HTMLInputElement>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [showBannerMenu, setShowBannerMenu] = useState(false);

  const currentAvatarUrl = avatarPreview || profile?.avatar_url || "";
  const currentBannerUrl = removeBanner ? null : (bannerPreview || profile?.cover_photo_url);
  const isVerified = !!profile?.is_verified;

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = profile?.avatar_url;
      let cover_photo_url = profile?.cover_photo_url;

      if (avatarBlob) {
        setAvatarUploading(true);
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarBlob, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatar_url = urlData.publicUrl;
        setAvatarUploading(false);
      }

      if (bannerBlob) {
        if (!isCloudinaryConfigured()) {
          throw new Error("Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.");
        }
        setBannerUploading(true);
        const result = await uploadToCloudinary(bannerBlob, { folder: `prangon/covers/${user?.id}` });
        cover_photo_url = result.secure_url;
        setBannerUploading(false);
      }

      if (removeBanner) {
        cover_photo_url = null;
      }

      if (username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", user?.id)
          .maybeSingle();
        if (existingUser) throw new Error("This username is already taken.");
      }

      if (displayName && displayName !== profile?.display_name) {
        const { data: existingName } = await supabase
          .from("profiles")
          .select("id")
          .eq("display_name", displayName)
          .neq("id", user?.id)
          .maybeSingle();
        if (existingName) throw new Error("This display name is already in use.");
      }

      const updateData: any = {
        display_name: displayName,
        username,
        bio,
        country,
        avatar_url,
        cover_photo_url,
        social_links: socialLinks as any,
      };

      // NEW SECTION: Only verified can set theme (Step 0 done, column exists)
      if (isVerified) {
        updateData.profile_theme = profileTheme;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated successfully!" });
      resetMediaState();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setAvatarUploading(false);
      setBannerUploading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetMediaState = () => {
    setAvatarCropSrc(null);
    setAvatarPreview(null);
    setAvatarBlob(null);
    setBannerCropSrc(null);
    setBannerPreview(null);
    setBannerBlob(null);
    setRemoveBanner(false);
    setShowBannerMenu(false);
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFileUpload(file, "image");
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }
    setAvatarCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleAvatarCropComplete = useCallback((blob: Blob) => {
    setAvatarCropSrc(null);
    setAvatarBlob(blob);
    setAvatarPreview(URL.createObjectURL(blob));
  }, []);

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFileUpload(file, "image");
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }
    setBannerCropSrc(URL.createObjectURL(file));
    setShowBannerMenu(false);
    e.target.value = "";
  };

  const handleBannerCropComplete = useCallback((blob: Blob) => {
    setBannerCropSrc(null);
    setBannerBlob(blob);
    setBannerPreview(URL.createObjectURL(blob));
    setRemoveBanner(false);
  }, []);

  const handleRemoveBanner = () => {
    setRemoveBanner(true);
    setBannerPreview(null);
    setBannerBlob(null);
    setShowBannerMenu(false);
  };

  const isSaving = updateProfileMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!isSaving) { if (!v) resetMediaState(); onOpenChange(v); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Banner Section */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Banner</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Recommended: 1500×500px (3:1 ratio)</p>
              <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-muted border border-border">
                {currentBannerUrl ? (
                  <img src={currentBannerUrl} alt="Banner preview" className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No banner set</div>
                )}
                {bannerUploading && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => bannerFileRef.current?.click()} disabled={isSaving}><ImageIcon className="h-3.5 w-3.5" />Gallery</Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => bannerCameraRef.current?.click()} disabled={isSaving}><Camera className="h-3.5 w-3.5" />Camera</Button>
                {(currentBannerUrl || profile?.cover_photo_url) && !removeBanner && (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemoveBanner} disabled={isSaving}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
                )}
              </div>
              <input ref={bannerFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBannerFileSelect} />
              <input ref={bannerCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBannerFileSelect} />
            </div>

            {/* Profile Picture Section */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20"><AvatarImage src={currentAvatarUrl} /><AvatarFallback><UserCircle className="h-12 w-12" /></AvatarFallback></Avatar>
                  {avatarUploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => avatarFileRef.current?.click()} disabled={isSaving}><ImageIcon className="h-3.5 w-3.5" />Choose from Gallery</Button>
                  <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP • Max 10MB</p>
                </div>
              </div>
              <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarFileSelect} />
            </div>

            {/* NEW SECTION ONLY - Verified Exclusive Theme - Keeps everything else exactly as before */}
            {isVerified && (
              <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/15 dark:to-orange-950/10 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm"><Crown className="h-4 w-4 text-white" /></div>
                  <Label className="text-[13px] font-bold flex items-center gap-1.5"><Palette className="h-4 w-4" />Verified Exclusive • Profile Theme</Label>
                  <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold shadow-sm">VERIFIED ONLY</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Exclusive Prangon feature for verified creators. Choose your signature profile look — preview updates instantly. You can switch back to <b>Default</b> anytime.</p>
                
                <div className="rounded-[14px] bg-background/80 border border-border/50 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</span>
                    {profileTheme !== 'default' && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />{profileTheme}</span>}
                  </div>
                  <div className={cn("rounded-xl overflow-hidden border transition-all duration-300", profileTheme === 'yellow' ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_24px_-8px_rgba(251,191,36,0.3)]" : "", profileTheme === 'mono' ? "border-zinc-300 dark:border-zinc-700 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-black grayscale contrast-[1.05]" : "", profileTheme === 'default' ? "border-border bg-muted/30" : "")}>
                    <div className={cn("h-[68px] w-full relative overflow-hidden", profileTheme === 'yellow' ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:to-yellow-950/20" : "", profileTheme === 'mono' ? "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900" : "bg-muted", profileTheme === 'default' ? "bg-gradient-to-br from-muted to-background" : "")}>
                      {currentBannerUrl && <img src={currentBannerUrl} alt="" className={cn("w-full h-full object-cover", profileTheme === 'mono' && "grayscale")} />}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    </div>
                    <div className="px-3 pb-3 flex items-center gap-3 -mt-6 relative z-10">
                      <div className={cn("rounded-full bg-background p-0.5 shadow-md transition-all duration-300", profileTheme === 'yellow' ? "ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.3),0_0_16px_rgba(251,191,36,0.4)]" : "", profileTheme === 'mono' ? "ring-2 ring-white dark:ring-black shadow-[0_0_0_3px_black,0_4px_12px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_3px_white]" : "ring-2 ring-background", profileTheme === 'default' ? "ring-2 ring-background" : "")}>
                        <Avatar className="h-12 w-12"><AvatarImage src={currentAvatarUrl} className={cn(profileTheme === 'mono' && "grayscale")} /><AvatarFallback><UserCircle className="h-8 w-8" /></AvatarFallback></Avatar>
                      </div>
                      <div className="pt-5">
                        <div className={cn("text-[14px] font-bold leading-tight", profileTheme === 'yellow' ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 bg-clip-text text-transparent" : "text-foreground")}>{displayName || profile?.display_name || "Your Name"}</div>
                        <div className="text-[11px] text-muted-foreground">@{username || profile?.username || "username"}</div>
                      </div>
                      {profileTheme !== 'default' && (
                        <div className={cn("ml-auto mt-5 text-[9px] px-2 py-1 rounded-full font-bold", profileTheme === 'yellow' ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-black" : "bg-black text-white dark:bg-white dark:text-black")}>{profileTheme === 'yellow' ? "★ GOLD" : "MONO"}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'default', label: 'Default', sub: 'Normal', ring: 'bg-background border-2 border-border', bg: 'bg-card', desc: 'Use default' },
                    { id: 'yellow', label: 'Yellow Gold', sub: 'Premium', ring: 'bg-gradient-to-br from-yellow-300 to-amber-500 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]', bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20', desc: 'Gold ring + amber' },
                    { id: 'mono', label: 'Mono B&W', sub: 'Elegant', ring: 'bg-gradient-to-br from-zinc-700 to-black border-zinc-800 shadow-[0_0_0_2px_white,0_0_0_4px_black]', bg: 'bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black', desc: 'B&W double ring' },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => setProfileTheme(t.id as VerifiedTheme)} className={cn("relative rounded-[14px] border-2 p-3 flex flex-col items-center gap-2.5 transition-all text-left", profileTheme === t.id ? "border-primary ring-2 ring-primary/20 scale-[1.02] shadow-md" : "border-border hover:border-border/80 hover:scale-[1.01] hover:shadow-sm", t.bg)}>
                      <div className={cn("h-11 w-11 rounded-full border shadow-sm flex items-center justify-center", t.ring)}>
                        {t.id === 'default' && <div className="h-8 w-8 rounded-full bg-muted" />}
                        {t.id === 'yellow' && <Crown className="h-5 w-5 text-white" />}
                        {t.id === 'mono' && <div className="h-5 w-5 rounded-full bg-white border border-black dark:border-white" />}
                      </div>
                      <div className="text-center">
                        <div className="text-[12px] font-bold leading-tight">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{t.sub}</div>
                        <div className="text-[9px] text-muted-foreground/70 mt-0.5">{t.desc}</div>
                      </div>
                      {profileTheme === t.id && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shadow-sm">✓</div>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-background/60 rounded-full px-3 py-1.5 border">
                  <span>Selected: <b className="text-foreground capitalize">{profileTheme}</b></span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />Live preview above</span>
                </div>
              </div>
            )}

            {/* Form Fields - EXACTLY AS BEFORE */}
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" rows={3} />
            </div>

            <div>
              <Label htmlFor="country" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Country
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{getCountryFlag(c.code)}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={isSaving}>
                {isSaving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {avatarCropSrc && <ImageCropDialog open={!!avatarCropSrc} onOpenChange={(v) => !v && setAvatarCropSrc(null)} imageSrc={avatarCropSrc} aspectRatio={1} shape="round" onCropComplete={handleAvatarCropComplete} />}
      {bannerCropSrc && <ImageCropDialog open={!!bannerCropSrc} onOpenChange={(v) => !v && setBannerCropSrc(null)} imageSrc={bannerCropSrc} aspectRatio={16 / 9} shape="rect" onCropComplete={handleBannerCropComplete} />}
    </>
  );
};
