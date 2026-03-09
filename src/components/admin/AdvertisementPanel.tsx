import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  MousePointerClick,
  TrendingUp,
  Image,
  Video,
  LayoutDashboard,
  ExternalLink,
  BarChart3,
  Target,
  Home,
  Circle,
  BookOpen,
  User,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type AdType = "feed" | "banner" | "story" | "video" | "carousel" | "interstitial" | "rewarded" | "native";

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  ad_type: AdType;
  media_url: string | null;
  target_url: string | null;
  target_countries: string[];
  target_content_types: string[];
  target_roles: string[];
  start_date: string | null;
  end_date: string | null;
  daily_impression_limit: number | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const adTypeConfig: Record<AdType, { label: string; icon: typeof Image; color: string }> = {
  feed: { label: "Feed Ad", icon: LayoutDashboard, color: "bg-muted text-foreground" },
  banner: { label: "Banner", icon: Image, color: "bg-muted text-foreground" },
  story: { label: "Story Ad", icon: Video, color: "bg-muted text-foreground" },
  video: { label: "Video Ad", icon: Video, color: "bg-muted text-foreground" },
  carousel: { label: "Carousel", icon: LayoutDashboard, color: "bg-muted text-foreground" },
  interstitial: { label: "Interstitial", icon: LayoutDashboard, color: "bg-muted text-foreground" },
  rewarded: { label: "Rewarded", icon: Target, color: "bg-muted text-foreground" },
  native: { label: "Native", icon: LayoutDashboard, color: "bg-muted text-foreground" },
};

const PLACEMENT_OPTIONS = [
  { value: "home_feed", label: "Home Feed", icon: Home },
  { value: "circles", label: "Circles", icon: Circle },
  { value: "stories", label: "Stories", icon: Film },
  { value: "explore", label: "Explore", icon: BookOpen },
  { value: "profile", label: "Profile", icon: User },
] as const;

export const AdvertisementPanel = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: ads, isLoading } = useQuery({
    queryKey: ["advertisements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Advertisement[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (ad: Partial<Advertisement>) => {
      if (ad.id) {
        const { error } = await supabase
          .from("advertisements")
          .update({
            title: ad.title,
            description: ad.description,
            ad_type: ad.ad_type,
            media_url: ad.media_url,
            target_url: ad.target_url,
            target_content_types: ad.target_content_types,
            is_active: ad.is_active,
            daily_impression_limit: ad.daily_impression_limit,
            start_date: ad.start_date,
            end_date: ad.end_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ad.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("advertisements")
          .insert({
            title: ad.title!,
            description: ad.description,
            ad_type: ad.ad_type!,
            media_url: ad.media_url,
            target_url: ad.target_url,
            target_content_types: ad.target_content_types || [],
            is_active: ad.is_active ?? true,
            daily_impression_limit: ad.daily_impression_limit,
            start_date: ad.start_date,
            end_date: ad.end_date,
            created_by: user?.id!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      queryClient.invalidateQueries({ queryKey: ["active-feed-ad"] });
      setIsCreateOpen(false);
      setEditingAd(null);
      toast({
        title: "Success",
        description: editingAd ? "Advertisement updated" : "Advertisement created",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("advertisements")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      queryClient.invalidateQueries({ queryKey: ["active-feed-ad"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("advertisements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      toast({ title: "Advertisement deleted" });
    },
  });

  const totalImpressions = ads?.reduce((sum, ad) => sum + ad.impressions, 0) || 0;
  const totalClicks = ads?.reduce((sum, ad) => sum + ad.clicks, 0) || 0;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const activeAds = ads?.filter((ad) => ad.is_active).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advertisement Panel</h2>
          <p className="text-muted-foreground">Manage ads across the platform</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Ad
            </Button>
          </DialogTrigger>
          <AdFormDialog
            ad={null}
            onSave={(ad) => saveMutation.mutate(ad)}
            isPending={saveMutation.isPending}
          />
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <Eye className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clicks</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <MousePointerClick className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold">{avgCTR}%</p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Ads</p>
                <p className="text-2xl font-bold">{activeAds}</p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ads List */}
      <Card>
        <CardHeader>
          <CardTitle>All Advertisements</CardTitle>
          <CardDescription>View and manage all ad campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !ads || ads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No advertisements yet</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create Your First Ad
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ads.map((ad) => {
                const config = adTypeConfig[ad.ad_type];
                const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
                const placements = ad.target_content_types || [];

                return (
                  <Card key={ad.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {ad.media_url ? (
                        <img
                          src={ad.media_url}
                          alt={ad.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{ad.title}</p>
                          <Badge variant="outline" className={cn("text-xs", config.color)}>
                            {config.label}
                          </Badge>
                          <Badge variant={ad.is_active ? "default" : "secondary"} className="text-xs">
                            {ad.is_active ? "Active" : "Paused"}
                          </Badge>
                        </div>

                        {/* Placements */}
                        {placements.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {placements.map((p: string) => {
                              const opt = PLACEMENT_OPTIONS.find((o) => o.value === p);
                              return (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {opt?.label || p}
                                </Badge>
                              );
                            })}
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {ad.impressions.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="h-3 w-3" /> {ad.clicks.toLocaleString()}
                          </span>
                          <span>{ctr}% CTR</span>
                          {ad.start_date && ad.end_date && (
                            <span>
                              {new Date(ad.start_date).toLocaleDateString()} – {new Date(ad.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={ad.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: ad.id, is_active: checked })
                          }
                        />
                        <Button variant="ghost" size="icon" onClick={() => setEditingAd(ad)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this advertisement?")) deleteMutation.mutate(ad.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingAd && (
        <Dialog open={!!editingAd} onOpenChange={() => setEditingAd(null)}>
          <AdFormDialog
            ad={editingAd}
            onSave={(ad) => saveMutation.mutate(ad)}
            isPending={saveMutation.isPending}
          />
        </Dialog>
      )}
    </div>
  );
};

// Ad Form Dialog Component
interface AdFormDialogProps {
  ad: Advertisement | null;
  onSave: (ad: Partial<Advertisement>) => void;
  isPending: boolean;
}

const AdFormDialog = ({ ad, onSave, isPending }: AdFormDialogProps) => {
  const [formData, setFormData] = useState({
    title: ad?.title || "",
    description: ad?.description || "",
    ad_type: ad?.ad_type || ("feed" as AdType),
    media_url: ad?.media_url || "",
    target_url: ad?.target_url || "",
    target_content_types: ad?.target_content_types || [] as string[],
    is_active: ad?.is_active ?? true,
    daily_impression_limit: ad?.daily_impression_limit || null as number | null,
    start_date: ad?.start_date?.split("T")[0] || "",
    end_date: ad?.end_date?.split("T")[0] || "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlacement = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      target_content_types: prev.target_content_types.includes(value)
        ? prev.target_content_types.filter((v) => v !== value)
        : [...prev.target_content_types, value],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `ads/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("post-media")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(data.path);

      setFormData({ ...formData, media_url: urlData.publicUrl });
      toast({ title: "Media uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.target_content_types.length === 0) {
      toast({ title: "Select at least one placement", variant: "destructive" });
      return;
    }
    onSave({
      id: ad?.id,
      ...formData,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
    });
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{ad ? "Edit Advertisement" : "Create Advertisement"}</DialogTitle>
        <DialogDescription>
          {ad ? "Update the advertisement details" : "Fill in the details to create a new ad"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ad title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ad description (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ad_type">Ad Type</Label>
            <Select
              value={formData.ad_type}
              onValueChange={(value: AdType) => setFormData({ ...formData, ad_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feed">Feed Ad</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
                <SelectItem value="story">Story Ad</SelectItem>
                <SelectItem value="video">Video Ad</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="interstitial">Interstitial</SelectItem>
                <SelectItem value="rewarded">Rewarded</SelectItem>
                <SelectItem value="native">Native</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily_limit">Daily Impression Limit</Label>
            <Input
              id="daily_limit"
              type="number"
              value={formData.daily_impression_limit || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  daily_impression_limit: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="Unlimited"
            />
          </div>
        </div>

        {/* Placement Selection */}
        <div className="space-y-2">
          <Label>Show Ad In <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {PLACEMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
                  formData.target_content_types.includes(opt.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <Checkbox
                  checked={formData.target_content_types.includes(opt.value)}
                  onCheckedChange={() => togglePlacement(opt.value)}
                />
                <opt.icon className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Media Upload */}
        <div className="space-y-2">
          <Label>Media</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Upload from Gallery
                </>
              )}
            </Button>
          </div>
          {formData.media_url && (
            <div className="relative mt-2">
              <img
                src={formData.media_url}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setFormData({ ...formData, media_url: "" })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Input
            value={formData.media_url}
            onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
            placeholder="Or paste image URL..."
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_url">Target URL</Label>
          <Input
            id="target_url"
            value={formData.target_url}
            onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : ad ? "Update Ad" : "Create Ad"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};
