import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Lock, Globe, ArrowLeft, MoreVertical, ImagePlus, Trash2, Pin, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const CATEGORIES = ["General", "Technology", "Sports", "Music", "Art", "Gaming", "Education", "Business", "Health", "Travel"];

// ── Circle Card ──
const CircleCard = ({ circle, userId, onJoin, onOpen }: any) => {
  const isMember = circle.is_member;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm"
    >
      <div
        className="h-24 bg-gradient-to-br from-primary/20 to-accent/20 bg-cover bg-center cursor-pointer"
        style={circle.banner_url ? { backgroundImage: `url(${circle.banner_url})` } : {}}
        onClick={() => onOpen(circle)}
      />
      <div className="px-4 pb-4 -mt-6 relative">
        <div className="flex items-end justify-between">
          <Avatar className="h-12 w-12 border-3 border-background shadow-md cursor-pointer" onClick={() => onOpen(circle)}>
            <AvatarImage src={circle.logo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {circle.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant={isMember ? "outline" : "default"}
            className="rounded-full text-xs h-8 px-4"
            style={!isMember ? { background: "#FF5A5F", borderColor: "#FF5A5F" } : {}}
            onClick={(e) => { e.stopPropagation(); onJoin(circle); }}
          >
            {isMember ? "Joined" : "Join"}
          </Button>
        </div>
        <div className="mt-2 cursor-pointer" onClick={() => onOpen(circle)}>
          <h3 className="font-bold text-sm text-foreground line-clamp-1 flex items-center gap-1.5">
            {circle.name}
            {circle.privacy === "private" && <Lock className="h-3 w-3 text-muted-foreground" />}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{circle.description || "No description"}</p>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{circle.members_count || 0} members</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Create Circle Steps ──
const CreateCircleDialog = ({ open, onOpenChange, userId }: any) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => { setStep(1); setName(""); setDescription(""); setCategory(""); setPrivacy("public"); setCoverFile(null); setIconFile(null); };

  const handleCreate = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setIsCreating(true);
    try {
      let banner_url = null, logo_url = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `circles/${userId}/${Date.now()}-cover.${ext}`;
        const { error } = await supabase.storage.from("banners").upload(path, coverFile);
        if (!error) banner_url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
      }
      if (iconFile) {
        const ext = iconFile.name.split(".").pop();
        const path = `circles/${userId}/${Date.now()}-icon.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, iconFile);
        if (!error) logo_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const { data: circle, error } = await supabase
        .from("community_groups")
        .insert({ name: name.trim(), description: description.trim(), category, privacy, created_by: userId, banner_url, logo_url })
        .select()
        .single();
      if (error) throw error;

      // Add creator as admin
      await supabase.from("community_group_members").insert({ group_id: circle.id, user_id: userId, role: "admin" });

      queryClient.invalidateQueries({ queryKey: ["circles"] });
      toast({ title: "Circle created!" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[360px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Create Circle — Step {step}/4</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 pt-2">
            {step === 1 && (
              <>
                <label className="block text-sm font-medium">Cover Image</label>
                <div className="h-28 bg-muted rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => document.getElementById("cover-upload")?.click()}>
                  {coverFile ? <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                </div>
                <label className="block text-sm font-medium">Circle Icon</label>
                <div className="flex justify-center">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => document.getElementById("icon-upload")?.click()}>
                    {iconFile ? <img src={URL.createObjectURL(iconFile)} className="w-full h-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                    <input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Input placeholder="Circle name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
                <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3} />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Privacy</label>
                {[
                  { value: "public", icon: Globe, label: "Public", desc: "Anyone can join" },
                  { value: "private", icon: Lock, label: "Private", desc: "Approval required" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrivacy(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${privacy === opt.value ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <opt.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Ready to create <strong>{name || "your circle"}</strong>?</p>
                <p className="text-xs text-muted-foreground">Category: {category || "None"} · {privacy === "public" ? "Public" : "Private"}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-2 pt-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-full">Back</Button>}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1 rounded-full" style={{ background: "#FF5A5F" }}>Next</Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="flex-1 rounded-full" style={{ background: "#FF5A5F" }}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Circle"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Inside Circle Page ──
const InsideCirclePage = ({ circle, userId, onBack }: any) => {
  const queryClient = useQueryClient();
  const isAdmin = circle.created_by === userId;

  const { data: members } = useQuery({
    queryKey: ["circle-members", circle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_group_members").select("*, profiles:user_id(*)").eq("group_id", circle.id) as any;
      return data || [];
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["circle-posts", circle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_group_posts").select("*").eq("group_id", circle.id).order("created_at", { ascending: false }) as any;
      return data || [];
    },
  });

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await supabase.from("community_group_posts").insert({ group_id: circle.id, user_id: userId, caption: postText.trim() });
      queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
      setPostText("");
      toast({ title: "Posted!" });
    } catch { toast({ title: "Error posting", variant: "destructive" }); }
    setPosting(false);
  };

  const isMember = members?.some((m: any) => m.user_id === userId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative">
        <div
          className="h-36 bg-gradient-to-br from-primary/20 to-accent/20 bg-cover bg-center"
          style={circle.banner_url ? { backgroundImage: `url(${circle.banner_url})` } : {}}
        />
        <button onClick={onBack} className="absolute top-3 left-3 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="px-4 -mt-8 relative z-10 flex items-end gap-3">
          <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
            <AvatarImage src={circle.logo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{circle.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="pb-1 flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              {circle.name}
              {circle.privacy === "private" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </h1>
            <p className="text-xs text-muted-foreground">{members?.length || 0} members</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-4 px-4">
        <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl bg-muted/50">
          <TabsTrigger value="posts" className="text-xs rounded-lg">Posts</TabsTrigger>
          <TabsTrigger value="media" className="text-xs rounded-lg">Media</TabsTrigger>
          <TabsTrigger value="members" className="text-xs rounded-lg">Members</TabsTrigger>
          <TabsTrigger value="about" className="text-xs rounded-lg">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4 pb-24">
          {isMember && (
            <div className="bg-card rounded-xl p-3 border border-border/50 space-y-2">
              <Textarea placeholder="What's on your mind?" value={postText} onChange={(e) => setPostText(e.target.value)} rows={2} className="resize-none" />
              <div className="flex justify-end">
                <Button size="sm" onClick={handlePost} disabled={posting || !postText.trim()} className="rounded-full" style={{ background: "#FF5A5F" }}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                </Button>
              </div>
            </div>
          )}
          {postsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : posts?.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No posts yet</p>
          ) : (
            posts?.map((post: any) => (
              <div key={post.id} className="bg-card rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm">{post.caption}</p>
                  {(isAdmin || post.user_id === userId) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="p-1"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={async () => {
                          await supabase.from("community_group_posts").delete().eq("id", post.id);
                          queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-4 pb-24">
          <p className="text-center text-sm text-muted-foreground py-8">Media content coming soon</p>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-2 pb-24">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.profiles?.avatar_url} />
                <AvatarFallback>{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold">{m.profiles?.display_name || m.profiles?.username}</p>
                <p className="text-xs text-muted-foreground">@{m.profiles?.username}</p>
              </div>
              {m.role === "admin" && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
              {isAdmin && m.user_id !== userId && (
                <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={async () => {
                  await supabase.from("community_group_members").delete().eq("id", m.id);
                  queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
                }}>Remove</Button>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="about" className="mt-4 pb-24 space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border/50 space-y-2">
            <p className="text-sm font-semibold">Description</p>
            <p className="text-sm text-muted-foreground">{circle.description || "No description"}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50 space-y-1">
            <p className="text-sm"><strong>Category:</strong> {circle.category || "General"}</p>
            <p className="text-sm"><strong>Privacy:</strong> {circle.privacy}</p>
            <p className="text-sm"><strong>Created:</strong> {new Date(circle.created_at).toLocaleDateString()}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Main Circles Page ──
const Circles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeCircle, setActiveCircle] = useState<any>(null);

  const { data: allCircles, isLoading } = useQuery({
    queryKey: ["circles", user?.id],
    queryFn: async () => {
      const { data: circles } = await supabase.from("community_groups").select("*").order("created_at", { ascending: false });
      if (!circles) return [];

      // Check membership
      const { data: memberships } = await supabase.from("community_group_members").select("group_id").eq("user_id", user?.id || "");
      const memberGroupIds = new Set(memberships?.map((m: any) => m.group_id) || []);

      return circles.map((c: any) => ({ ...c, is_member: memberGroupIds.has(c.id) }));
    },
    enabled: !!user?.id,
  });

  const yourCircles = useMemo(() => allCircles?.filter((c: any) => c.is_member) || [], [allCircles]);
  const recommended = useMemo(() => allCircles?.filter((c: any) => !c.is_member) || [], [allCircles]);

  const handleJoin = async (circle: any) => {
    if (circle.is_member) {
      // Leave
      await supabase.from("community_group_members").delete().eq("group_id", circle.id).eq("user_id", user?.id);
      toast({ title: "Left circle" });
    } else {
      await supabase.from("community_group_members").insert({ group_id: circle.id, user_id: user?.id, role: "member" });
      toast({ title: "Joined circle!" });
    }
    queryClient.invalidateQueries({ queryKey: ["circles"] });
  };

  if (activeCircle) {
    return <InsideCirclePage circle={activeCircle} userId={user?.id} onBack={() => { setActiveCircle(null); queryClient.invalidateQueries({ queryKey: ["circles"] }); }} />;
  }

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-4 pb-24">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">Circles</h1>
          <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-full gap-1.5" style={{ background: "#FF5A5F" }}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {yourCircles.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Your Circles</h2>
                <div className="grid grid-cols-2 gap-3">
                  {yourCircles.map((c: any) => (
                    <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {recommended.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recommended</h2>
                <div className="grid grid-cols-2 gap-3">
                  {recommended.map((c: any) => (
                    <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {(!allCircles || allCircles.length === 0) && (
              <div className="text-center py-16">
                <CircleDot className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No circles yet. Create the first one!</p>
              </div>
            )}
          </>
        )}

        <CreateCircleDialog open={showCreate} onOpenChange={setShowCreate} userId={user?.id} />
      </div>
    </MainLayout>
  );
};

export default Circles;
