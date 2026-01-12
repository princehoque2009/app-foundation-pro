import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  MousePointerClick,
  TrendingUp,
  Globe,
  Image,
  Video,
  LayoutDashboard,
  Pause,
  Play,
  ExternalLink,
  BarChart3,
  Calendar,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type AdType = "feed" | "banner" | "story" | "video";

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
  feed: { label: "Feed Ad", icon: LayoutDashboard, color: "bg-blue-500/10 text-blue-500" },
  banner: { label: "Banner", icon: Image, color: "bg-amber-500/10 text-amber-500" },
  story: { label: "Story Ad", icon: Video, color: "bg-purple-500/10 text-purple-500" },
  video: { label: "Video Ad", icon: Video, color: "bg-emerald-500/10 text-emerald-500" },
};

export const AdvertisementPanel = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all advertisements
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

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (ad: Partial<Advertisement>) => {
      if (ad.id) {
        // Update
        const { error } = await supabase
          .from("advertisements")
          .update({
            title: ad.title,
            description: ad.description,
            ad_type: ad.ad_type,
            media_url: ad.media_url,
            target_url: ad.target_url,
            is_active: ad.is_active,
            daily_impression_limit: ad.daily_impression_limit,
            start_date: ad.start_date,
            end_date: ad.end_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ad.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("advertisements")
          .insert({
            title: ad.title!,
            description: ad.description,
            ad_type: ad.ad_type!,
            media_url: ad.media_url,
            target_url: ad.target_url,
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
      setIsCreateOpen(false);
      setEditingAd(null);
      toast({
        title: "Success",
        description: editingAd ? "Advertisement updated" : "Advertisement created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active status
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
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("advertisements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      toast({ title: "Advertisement deleted" });
    },
  });

  // Calculate stats
  const totalImpressions = ads?.reduce((sum, ad) => sum + ad.impressions, 0) || 0;
  const totalClicks = ads?.reduce((sum, ad) => sum + ad.clicks, 0) || 0;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const activeAds = ads?.filter((ad) => ad.is_active).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <MousePointerClick className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average CTR</p>
                <p className="text-2xl font-bold">{avgCTR}%</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-amber-500" />
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
              <div className="p-3 bg-primary/10 rounded-full">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ads Table */}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => {
                  const config = adTypeConfig[ad.ad_type];
                  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
                  
                  return (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {ad.media_url ? (
                            <img
                              src={ad.media_url}
                              alt={ad.title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Image className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{ad.title}</p>
                            {ad.target_url && (
                              <a
                                href={ad.target_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          <config.icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ad.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: ad.id, is_active: checked })
                            }
                          />
                          <Badge variant={ad.is_active ? "default" : "secondary"}>
                            {ad.is_active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{ad.impressions.toLocaleString()}</TableCell>
                      <TableCell>{ad.clicks.toLocaleString()}</TableCell>
                      <TableCell>{ctr}%</TableCell>
                      <TableCell>
                        {ad.start_date && ad.end_date ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(ad.start_date).toLocaleDateString()} - {new Date(ad.end_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Always</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAd(ad)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this advertisement?")) {
                                deleteMutation.mutate(ad.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
    ad_type: ad?.ad_type || "feed",
    media_url: ad?.media_url || "",
    target_url: ad?.target_url || "",
    is_active: ad?.is_active ?? true,
    daily_impression_limit: ad?.daily_impression_limit || null,
    start_date: ad?.start_date?.split("T")[0] || "",
    end_date: ad?.end_date?.split("T")[0] || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: ad?.id,
      ...formData,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
    });
  };

  return (
    <DialogContent className="max-w-lg">
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

        <div className="space-y-2">
          <Label htmlFor="media_url">Media URL</Label>
          <Input
            id="media_url"
            value={formData.media_url}
            onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
            placeholder="https://..."
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