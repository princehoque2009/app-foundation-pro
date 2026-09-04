import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  LayoutGrid,
  Rows3,
  X,
  Heart,
  MessageCircle,
  Play,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchivedPosts, useToggleArchive } from "@/hooks/usePostInteractions";
import { useDeletePost } from "@/hooks/usePostActions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getTextCardTheme } from "@/lib/textCardStyles";
import { useProfileGridPrefs } from "@/hooks/useProfileGridPrefs";

interface ArchivedPostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const Thumb = ({ post, textStyle }: { post: any; textStyle: any }) => {
  const theme = getTextCardTheme(textStyle);
  if (post.media_url && post.media_type === "video") {
    return (
      <div className="relative h-full w-full bg-black">
        <video src={post.media_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <Play className="absolute right-2 top-2 h-4 w-4 fill-white/30 text-white drop-shadow" />
      </div>
    );
  }
  if (post.media_url) {
    return (
      <img
        src={post.media_url}
        alt={post.caption || "Archived post"}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center p-2 text-center", theme.card)}>
      <p className={cn("line-clamp-4 text-[11px] leading-snug", theme.type)}>
        {post.caption || "Text post"}
      </p>
    </div>
  );
};

export const ArchivedPostsModal = ({ open, onOpenChange }: ArchivedPostsModalProps) => {
  const { data: archivedPosts, isLoading, error } = useArchivedPosts();
  const { prefs } = useProfileGridPrefs();
  const deletePost = useDeletePost();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selection, setSelection] = useState<string[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const posts = useMemo(() => {
    const list = (archivedPosts as any[]) || [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((p) => (p.caption || "").toLowerCase().includes(q)) : list;
  }, [archivedPosts, query]);

  const restoreOne = useToggleArchive(preview?.id || "none");

  const toggleSelect = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const bulk = async (action: "restore" | "delete") => {
    if (selection.length === 0) return;
    if (action === "delete" && !confirm(`Delete ${selection.length} post(s) permanently?`)) return;
    setBusy(true);
    try {
      if (action === "delete") {
        for (const id of selection) await deletePost.mutateAsync(id);
        toast({ title: `${selection.length} post(s) deleted` });
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: err } = await supabase
          .from("posts")
          .update({ is_archived: false, archived_at: null })
          .in("id", selection);
        if (err) throw err;
        toast({ title: `${selection.length} post(s) back on your profile` });
      }
      setSelection([]);
      const { queryClient } = await import("@/lib/queryClient").catch(() => ({ queryClient: null as any }));
      queryClient?.invalidateQueries?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Action failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRestorePreview = async () => {
    try {
      await restoreOne.mutateAsync(true);
      toast({ title: "Back on your profile" });
      setPreview(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to restore", variant: "destructive" });
    }
  };

  const handleDeletePreview = async () => {
    if (!preview || !confirm("Delete this post permanently?")) return;
    try {
      await deletePost.mutateAsync(preview.id);
      toast({ title: "Post deleted" });
      setPreview(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl p-0">
        {/* Header */}
        <div className="shrink-0 border-b px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              <h2 className="text-base font-semibold">Archive</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {(archivedPosts as any[])?.length || 0}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                title={view === "grid" ? "List view" : "Grid view"}
              >
                {view === "grid" ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Only you can see these. Restore any post to put it back on your profile.
          </p>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search captions"
              className="h-9 rounded-full pl-9"
            />
          </div>

          {selection.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2">
              <span className="text-xs font-medium">{selection.length} selected</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" className="h-8 gap-1.5 rounded-full text-xs" disabled={busy} onClick={() => bulk("restore")}>
                  <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full text-xs text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => bulk("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => setSelection([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-destructive">
                <AlertCircle className="mr-2 h-5 w-5" />
                <span>Failed to load archived posts</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Archive className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-base font-medium text-foreground">
                  {query ? "No matches" : "Nothing archived"}
                </p>
                <p className="text-sm">{query ? "Try a different search." : "Posts you archive will show up here"}</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {posts.map((post: any) => {
                  const selected = selection.includes(post.id);
                  return (
                    <div key={post.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <button className="h-full w-full" onClick={() => setPreview(post)}>
                        <Thumb post={post} textStyle={prefs.textCardStyle} />
                      </button>
                      <button
                        onClick={() => toggleSelect(post.id)}
                        aria-label={selected ? "Deselect" : "Select"}
                        className={cn(
                          "absolute left-1.5 top-1.5 rounded-full bg-black/40 p-0.5 text-white transition-opacity",
                          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                      {selected && <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-primary" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post: any) => {
                  const selected = selection.includes(post.id);
                  return (
                    <div
                      key={post.id}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-3",
                        selected && "border-primary bg-primary/5"
                      )}
                    >
                      <button
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                        onClick={() => setPreview(post)}
                      >
                        <Thumb post={post} textStyle={prefs.textCardStyle} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-words text-sm">{post.caption || "No caption"}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(post.created_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.likes_count || 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {post.comments_count || 0}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => setPreview(post)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-full text-xs"
                            onClick={() => toggleSelect(post.id)}
                          >
                            {selected ? "Deselect" : "Select"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Full post preview */}
        {preview && (
          <div className="absolute inset-0 z-50 flex flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Archived post</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                <div className="overflow-hidden rounded-2xl bg-muted">
                  {preview.media_url && preview.media_type === "video" ? (
                    <video src={preview.media_url} className="max-h-[55vh] w-full object-contain" controls playsInline />
                  ) : preview.media_url ? (
                    <img src={preview.media_url} alt={preview.caption || "Archived post"} className="max-h-[55vh] w-full object-contain" />
                  ) : (
                    <div className={cn("p-8 text-center", getTextCardTheme(prefs.textCardStyle).card)}>
                      <p className={cn("whitespace-pre-line text-lg leading-snug", getTextCardTheme(prefs.textCardStyle).type)}>
                        {preview.caption || "Text post"}
                      </p>
                    </div>
                  )}
                </div>
                {preview.media_url && preview.caption && (
                  <p className="mt-3 whitespace-pre-line text-sm">{preview.caption}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatDate(preview.created_at)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> {preview.likes_count || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> {preview.comments_count || 0}
                  </span>
                </div>
              </div>
            </ScrollArea>
            <div className="flex shrink-0 gap-2 border-t p-4">
              <Button className="flex-1 gap-2 rounded-full" onClick={handleRestorePreview} disabled={restoreOne.isPending}>
                <ArchiveRestore className="h-4 w-4" /> Add back to profile
              </Button>
              <Button
                variant="ghost"
                className="gap-2 rounded-full text-destructive hover:text-destructive"
                onClick={handleDeletePreview}
                disabled={deletePost.isPending}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
