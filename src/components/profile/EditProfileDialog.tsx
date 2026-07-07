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
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UserCircle, Camera, Image as ImageIcon, MapPin, Loader2, Trash2 } from "lucide-react";
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

  // Sync state when profile changes
  const currentAvatarUrl = avatarPreview || profile?.avatar_url || "";
  const currentBannerUrl = removeBanner ? null : (bannerPreview || profile?.cover_photo_url);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = profile?.avatar_url;
      let cover_photo_url = profile?.cover_photo_url;

      // Upload avatar if changed
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

      // Upload banner to Cloudinary if changed
      if (bannerBlob) {
        if (!isCloudinaryConfigured()) {
          throw new Error("Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.");
        }
        setBannerUploading(true);
        const result = await uploadToCloudinary(bannerBlob, { folder: `prangon/covers/${user?.id}` });
        cover_photo_url = result.secure_url;
        setBannerUploading(false);
      }

      // Remove banner if requested
      if (removeBanner) {
        cover_photo_url = null;
      }

      // Validate username uniqueness
      if (username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", user?.id)
          .maybeSingle();
        if (existingUser) throw new Error("This username is already taken.");
      }

      // Validate display name uniqueness
      if (displayName && displayName !== profile?.display_name) {
        const { data: existingName } = await supabase
          .from("profiles")
          .select("id")
          .eq("display_name", displayName)
          .neq("id", user?.id)
          .maybeSingle();
        if (existingName) throw new Error("This display name is already in use.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username,
          bio,
          country,
          avatar_url,
          cover_photo_url,
          social_links: socialLinks as any,
        })
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

  // Avatar handlers
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

  // Banner handlers
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
                  <img
                    src={currentBannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    No banner set
                  </div>
                )}
                {bannerUploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              
              {/* Banner action buttons */}
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => bannerFileRef.current?.click()}
                  disabled={isSaving}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Gallery
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => bannerCameraRef.current?.click()}
                  disabled={isSaving}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Camera
                </Button>
                {(currentBannerUrl || profile?.cover_photo_url) && !removeBanner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleRemoveBanner}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
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
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={currentAvatarUrl} />
                    <AvatarFallback>
                      <UserCircle className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={isSaving}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Choose from Gallery
                  </Button>
                  <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP • Max 10MB</p>
                </div>
              </div>
              <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarFileSelect} />
            </div>

            {/* Form Fields */}
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
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      {avatarCropSrc && (
        <ImageCropDialog
          open={!!avatarCropSrc}
          onOpenChange={(v) => !v && setAvatarCropSrc(null)}
          imageSrc={avatarCropSrc}
          aspectRatio={1}
          shape="round"
          onCropComplete={handleAvatarCropComplete}
        />
      )}

      {/* Banner Crop Dialog */}
      {bannerCropSrc && (
        <ImageCropDialog
          open={!!bannerCropSrc}
          onOpenChange={(v) => !v && setBannerCropSrc(null)}
          imageSrc={bannerCropSrc}
          aspectRatio={3}
          shape="rect"
          onCropComplete={handleBannerCropComplete}
        />
      )}
    </>
  );
};
