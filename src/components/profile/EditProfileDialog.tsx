import React, { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { UserCircle, Camera, Image as ImageIcon, Loader2, Trash2, Lock, Unlock } from "lucide-react";
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

const NITRO_PIN_ENC = "c2hvaGFpbDA5";
const getNitroPin = () => {
  try { return atob(NITRO_PIN_ENC); } catch { return ""; }
};

export const EditProfileDialog = ({ profile, open, onOpenChange }: EditProfileDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [profileTheme, setProfileTheme] = useState<'default' | 'yellow' | 'mono' | 'nitro'>((profile as any)?.profile_theme || 'default');
  const isVerified = !!profile?.is_verified;

  const [isNitroUnlocked, setIsNitroUnlocked] = useState(false);
  const [showNitroPinDialog, setShowNitroPinDialog] = useState(false);
  const [nitroPinInput, setNitroPinInput] = useState("");

  React.useEffect(() => {
    if (!profile) return;
    if (profile.display_name) setDisplayName(profile.display_name);
    if (profile.username) setUsername(profile.username);
    if (profile.bio !== undefined) setBio(profile.bio || "");
    if (profile.country) setCountry(profile.country);
    if ((profile as any)?.profile_theme) setProfileTheme((profile as any).profile_theme);
    if (profile.social_links && typeof profile.social_links === 'object') {
      setSocialLinks(profile.social_links as any);
    }
    if ((profile as any)?.profile_theme === 'nitro') setIsNitroUnlocked(true);
  }, [profile?.id, profile?.display_name, profile?.username, profile?.bio, profile?.country, (profile as any)?.profile_theme, profile?.social_links]);

  React.useEffect(() => {
    if (!user?.id) return;
    const unlocked = localStorage.getItem(`nitro_unlocked_${user.id}`) === 'true';
    if (unlocked) setIsNitroUnlocked(true);
  }, [user?.id]);

  const [socialLinks, setSocialLinks] = useState<SocialLinksMap>(
    (profile?.social_links && typeof profile.social_links === "object") ? profile.social_links : {}
  );

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const normalBannerFileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [normalBannerPreview, setNormalBannerPreview] = useState<string | null>(null);
  const [nitroBannerPreview, setNitroBannerPreview] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [normalBannerBlob, setNormalBannerBlob] = useState<Blob | null>(null);
  const [nitroBannerBlob, setNitroBannerBlob] = useState<Blob | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'normal' | 'nitro'>('normal');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [removeNormalBanner, setRemoveNormalBanner] = useState(false);
  const [removeNitroBanner, setRemoveNitroBanner] = useState(false);

  // Dual banner: normal and nitro separate, one at a time per theme
  const currentAvatarUrl = avatarPreview || profile?.avatar_url;
  const currentNormalBannerUrl = removeNormalBanner ? null : (normalBannerPreview || profile?.cover_photo_url);
  const currentNitroBannerUrl = removeNitroBanner ? null : (nitroBannerPreview || (profile as any)?.nitro_cover_url);
  const activeBannerForTheme = profileTheme === 'nitro' ? (currentNitroBannerUrl || currentNormalBannerUrl) : currentNormalBannerUrl;

  const handleThemeSelect = (themeId: 'default' | 'yellow' | 'mono' | 'nitro') => {
    if (themeId === 'nitro') {
      if (!isVerified) {
        toast({ title: "Verified only", description: "Nitro is only for verified profiles", variant: "destructive" });
        return;
      }
      if (!isNitroUnlocked) {
        setShowNitroPinDialog(true);
        return;
      }
    }
    setProfileTheme(themeId);
  };

  const handleNitroPinSubmit = () => {
    const pin = nitroPinInput.trim();
    if (pin === getNitroPin()) {
      setIsNitroUnlocked(true);
      if (user?.id) localStorage.setItem(`nitro_unlocked_${user.id}`, 'true');
      setProfileTheme('nitro');
      setShowNitroPinDialog(false);
      setNitroPinInput("");
      toast({ title: "Unlocked! ⚡" });
    } else {
      toast({ title: "Incorrect", variant: "destructive" });
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = profile?.avatar_url;
      let cover_photo_url = profile?.cover_photo_url;
      let nitro_cover_url = (profile as any)?.nitro_cover_url;

      if (avatarBlob) {
        setAvatarUploading(true);
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("avatars").upload(fileName, avatarBlob, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatar_url = data.publicUrl;
        setAvatarUploading(false);
      }

      if (normalBannerBlob) {
        if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");
        setBannerUploading(true);
        const result = await uploadToCloudinary(normalBannerBlob, { folder: `prangon/covers/${user?.id}` });
        cover_photo_url = result.secure_url;
        setBannerUploading(false);
      }
      if (nitroBannerBlob) {
        if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");
        setBannerUploading(true);
        const result = await uploadToCloudinary(nitroBannerBlob, { folder: `prangon/covers/${user?.id}/nitro` });
        nitro_cover_url = result.secure_url;
        setBannerUploading(false);
      }

      if (removeNormalBanner) cover_photo_url = null;
      if (removeNitroBanner) nitro_cover_url = null;

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
        nitro_cover_url,
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

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'normal' | 'nitro') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isGif = file.type === "image/gif";
    
    if (target === 'nitro') {
      if (!isNitroUnlocked) {
        toast({ title: "Locked", variant: "destructive" });
        return;
      }
      const validation = validateFileUpload(file, { maxSizeMB: 10, allowedTypes: ["image/gif", "image/jpeg", "image/png", "image/webp"] });
      if (!validation.valid) { toast({ title: validation.error, variant: "destructive" }); return; }
      if (isGif) {
        setNitroBannerBlob(file);
        setNitroBannerPreview(URL.createObjectURL(file));
        setRemoveNitroBanner(false);
      } else {
        setCropTarget('nitro');
        setBannerCropSrc(URL.createObjectURL(file));
      }
    } else {
      if (isGif) {
        toast({ title: "GIF only for Nitro", description: "Use Nitro theme for GIF", variant: "destructive" });
        return;
      }
      const validation = validateFileUpload(file, { maxSizeMB: 10, allowedTypes: ["image/jpeg", "image/png", "image/webp"] });
      if (!validation.valid) { toast({ title: validation.error, variant: "destructive" }); return; }
      setCropTarget('normal');
      setBannerCropSrc(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const handleBannerCropComplete = useCallback((blob: Blob) => {
    if (cropTarget === 'nitro') {
      setNitroBannerBlob(blob);
      setNitroBannerPreview(URL.createObjectURL(blob));
      setRemoveNitroBanner(false);
    } else {
      setNormalBannerBlob(blob);
      setNormalBannerPreview(URL.createObjectURL(blob));
      setRemoveNormalBanner(false);
    }
    setBannerCropSrc(null);
  }, [cropTarget]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 rounded-[24px]">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] px-6">
            <div className="space-y-6 pb-6">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    {profileTheme === 'nitro' ? "Nitro Banner" : "Banner"}
                    {profileTheme === 'nitro' ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white">GIF allowed • Exclusive</span> : null}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {profileTheme === 'nitro' ? "This banner shows only on Nitro theme. Switch theme to see normal banner." : "Normal banner for Default/Gold/Platinum. Nitro has separate GIF banner."}
                  </p>
                  <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-muted border">
                    {activeBannerForTheme ? <img src={activeBannerForTheme} alt="Banner" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{profileTheme === 'nitro' ? "No Nitro banner yet" : "No banner"}</div>}
                    {bannerUploading && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => (profileTheme === 'nitro' ? bannerFileRef : normalBannerFileRef).current?.click()} disabled={isSaving}><ImageIcon className="h-3.5 w-3.5" />{profileTheme === 'nitro' ? "Set Nitro Banner" : "Set Banner"}</Button>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => { if (profileTheme === 'nitro') { setRemoveNitroBanner(true); setNitroBannerPreview(null); setNitroBannerBlob(null); } else { setRemoveNormalBanner(true); setNormalBannerPreview(null); setNormalBannerBlob(null); } }} disabled={isSaving}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
                  </div>
                  <input ref={normalBannerFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleBannerFileSelect(e, 'normal')} />
                  <input ref={bannerFileRef} type="file" accept="image/*,image/gif" className="hidden" onChange={(e) => handleBannerFileSelect(e, 'nitro')} />
                </div>
                <div className="rounded-xl border border-dashed p-3 bg-muted/20">
                  <div className="text-[11px] font-medium mb-1">Banner Status</div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span>Normal: {profile?.cover_photo_url ? "✓ Set" : "— Empty"}</span>
                    <span>Nitro: {(profile as any)?.nitro_cover_url ? "✓ Set" : "— Empty"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">When you switch to Nitro, Nitro banner shows. When you switch to Gold/Platinum/Default, normal banner shows. One at a time.</p>
                </div>
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
                <div><Label>Display 
