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

type VerifiedTheme = 'default' | 'yellow' | 'mono';

export const EditProfileDialog = ({ profile, open, onOpenChange }: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [socialLinks, setSocialLinks] = useState<SocialLinksMap>(profile?.social_links || {});
  const [profileTheme, setProfileTheme] = useState<VerifiedTheme>(profile?.profile_theme || 'default');

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const bannerCameraRef = useRef<HTMLInputElement>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  const currentAvatarUrl = avatarPreview || profile?.avatar_url || "";
  const currentBannerUrl = removeBanner ? null : (bannerPreview || profile?.cover_photo_url);
  const isVerified = !!profile?.is_verified;

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = profile?.avatar_url;
      let cover_photo_url = profile?.cover_photo_url;
      if (avatarBlob) {
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("avatars").upload(fileName, avatarBlob, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatar_url = data.publicUrl;
      }
      if (bannerBlob) {
        const result = await uploadToCloudinary(bannerBlob, { folder: `prangon/covers/${user?.id}` });
        cover_photo_url = result.secure_url;
      }
      if (removeBanner) cover_photo_url = null;
      const updateData: any = { display_name: displayName, username, bio, country, avatar_url, cover_photo_url, social_links: socialLinks };
      if (isVerified) updateData.profile_theme = profileTheme;
      const { error } = await supabase.from("profiles").update(updateData).eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleAvatarFileSelect = (e: any) => { const f = e.target.files?.[0]; if (!f) return; setAvatarCropSrc(URL.createObjectURL(f)); e.target.value=""; };
  const handleBannerFileSelect = (e: any) => { const f = e.target.files?.[0]; if (!f) return; setBannerCropSrc(URL.createObjectURL(f)); e.target.value=""; };
  const handleAvatarCropComplete = useCallback((b: Blob) => { setAvatarCropSrc(null); setAvatarBlob(b); setAvatarPreview(URL.createObjectURL(b)); }, []);
  const handleBannerCropComplete = useCallback((b: Blob) => { setBannerCropSrc(null); setBannerBlob(b); setBannerPreview(URL.createObjectURL(b)); setRemoveBanner(false); }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {isVerified && (
              <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center"><Crown className="h-4 w-4 text-white" /></div>
                  <Label className="text-[13px] font-bold flex items-center gap-1.5"><Palette className="h-4 w-4" />Verified Exclusive • Profile Theme</Label>
                  <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold">VERIFIED ONLY</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Exclusive Prangon feature for verified creators. Choose your signature profile look — preview updates instantly. You can switch back to <b>Default</b> anytime.</p>
                
                <div className="rounded-[14px] bg-background/80 border p-3">
                  <div className="flex items-center gap-1.5 mb-2.5"><Eye className="h-3.5 w-3.5" /><span className="text-[11px] font-semibold uppercase">Live Preview</span>{profileTheme !== 'default' && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary text-white">{profileTheme}</span>}</div>
                  <div className={cn("rounded-xl overflow-hidden border", profileTheme === 'yellow' ? "border-amber-300 bg-amber-50" : "", profileTheme === 'mono' ? "border-zinc-300 bg-zinc-50 grayscale" : "border-border bg-muted/30")}>
                    <div className="h-[68px] w-full bg-muted">{currentBannerUrl && <img src={currentBannerUrl} className={cn("w-full h-full object-cover", profileTheme === 'mono' && "grayscale")} />}</div>
                    <div className="px-3 pb-3 flex items-center gap-3 -mt-6">
                      <div className={cn("rounded-full bg-background p-0.5", profileTheme === 'yellow' ? "ring-2 ring-amber-400" : "", profileTheme === 'mono' ? "ring-2 ring-white shadow-[0_0_0_3px_black]" : "ring-2 ring-background")}><Avatar className="h-12 w-12"><AvatarImage src={currentAvatarUrl} className={cn(profileTheme === 'mono' && "grayscale")} /></Avatar></div>
                      <div className="pt-5"><div className={cn("text-[14px] font-bold", profileTheme === 'yellow' ? "bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent" : "")}>{displayName || "Your Name"}</div><div className="text-[11px] text-muted-foreground">@{username}</div></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'default', label: 'Default', sub: 'Normal' },
                    { id: 'yellow', label: 'Yellow Gold', sub: 'Premium' },
                    { id: 'mono', label: 'Mono B&W', sub: 'Elegant' },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => setProfileTheme(t.id as any)} className={cn("relative rounded-[14px] border-2 p-3 flex flex-col items-center gap-2", profileTheme === t.id ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border")}>
                      <div className={cn("h-11 w-11 rounded-full", t.id === 'default' ? "bg-background border-2" : t.id === 'yellow' ? "bg-gradient-to-br from-yellow-300 to-amber-500" : "bg-black")} />
                      <div className="text-center"><div className="text-[12px] font-bold">{t.label}</div><div className="text-[10px] text-muted-foreground">{t.sub}</div></div>
                      {profileTheme === t.id && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px]">✓</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></div>
            <div><Label>Country</Label><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent><ScrollArea className="h-[200px]">{countries.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}</ScrollArea></SelectContent></Select></div>
            <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>Save Changes</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      {avatarCropSrc && <ImageCropDialog open={!!avatarCropSrc} onOpenChange={(v) => !v && setAvatarCropSrc(null)} imageSrc={avatarCropSrc} aspectRatio={1} shape="round" onCropComplete={handleAvatarCropComplete} />}
      {bannerCropSrc && <ImageCropDialog open={!!bannerCropSrc} onOpenChange={(v) => !v && setBannerCropSrc(null)} imageSrc={bannerCropSrc} aspectRatio={16 / 9} shape="rect" onCropComplete={handleBannerCropComplete} />}
    </>
  );
};
