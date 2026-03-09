import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowLeft, Calendar, Download, Share2, ChevronLeft, ChevronRight, Sparkles, Heart, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { format, subYears, formatDistanceToNow } from "date-fns";
import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";

const CONFETTI_EMOJIS = ["🎉", "✨", "💫", "🌟", "🎊", "💖", "🦋", "🌈"];

const MemoryCard = ({ post, yearsAgo, date }: { post: any; yearsAgo: number; date: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `prangon-memory-${yearsAgo}y-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Memory downloaded! 🎉", description: "Check your downloads folder." });
    } catch {
      toast({ title: "Download failed", description: "Could not capture the memory card.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }, [yearsAgo]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `prangon-memory.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Prangon Memory", text: `A memory from ${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago!` });
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  }, [yearsAgo, handleDownload]);

  const hasImage = post.media_type === "image" && post.media_url;
  const hasVideo = post.media_type === "video" && post.media_url;
  const randomEmoji = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* The downloadable card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-border shadow-xl"
        style={{
          background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)`,
        }}
      >
        {/* Decorative floating shapes */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-accent/20 blur-xl" />
        <div className="absolute top-1/2 right-4 text-4xl opacity-10 select-none pointer-events-none">{randomEmoji}</div>

        {/* Header ribbon */}
        <div className="relative px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-destructive flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">{yearsAgo}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">
                {yearsAgo} year{yearsAgo > 1 ? "s" : ""} ago today
              </p>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-semibold text-primary">Memory</span>
          </div>
        </div>

        {/* Media section */}
        {hasImage && (
          <div className="relative mx-4 rounded-2xl overflow-hidden aspect-square max-h-[360px] shadow-inner">
            <img
              src={post.media_url}
              alt="Memory"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <Avatar className="w-7 h-7 border-2 border-white/80">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {(post.profiles?.display_name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-white drop-shadow">
                {post.profiles?.display_name || post.profiles?.username || "You"}
              </span>
            </div>
          </div>
        )}

        {hasVideo && (
          <div className="relative mx-4 rounded-2xl overflow-hidden aspect-video max-h-[280px] bg-muted flex items-center justify-center shadow-inner">
            <video src={post.media_url} className="w-full h-full object-cover" muted />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[14px] border-l-primary border-y-[9px] border-y-transparent ml-1" />
              </div>
            </div>
          </div>
        )}

        {!hasImage && !hasVideo && (
          <div className="mx-4 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/10 border border-border/50 p-6 flex items-center justify-center min-h-[120px]">
            <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="px-5 pt-3">
            <p className="text-sm text-foreground leading-relaxed line-clamp-4">
              {post.caption}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-4">
          {(post.likes_count ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-xs text-muted-foreground font-medium">{post.likes_count}</span>
            </div>
          )}
          {(post.comments_count ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">💬 {post.comments_count}</span>
            </div>
          )}
        </div>

        {/* Prangon watermark */}
        <div className="px-5 pb-4 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 opacity-40">
            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[7px] font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">PRANGON</span>
          </div>
          <span className="text-[10px] text-muted-foreground opacity-40">
            {format(new Date(), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Action buttons (outside downloadable area) */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full gap-2 border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Saving…" : "Download"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="rounded-full gap-2 border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>
    </motion.div>
  );
};

const Memories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const { data: memories, isLoading } = useQuery({
    queryKey: ["memories", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const results: { year: number; posts: any[] }[] = [];
      for (let y = 1; y <= 5; y++) {
        const targetDate = subYears(today, y);
        const dayStart = format(targetDate, "yyyy-MM-dd") + "T00:00:00";
        const dayEnd = format(targetDate, "yyyy-MM-dd") + "T23:59:59";
        const { data } = await supabase
          .from("posts")
          .select(`*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified)`)
          .eq("user_id", user!.id)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd)
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          results.push({ year: y, posts: data });
        }
      }
      return results;
    },
  });

  const allCards = memories?.flatMap((g) =>
    g.posts.map((p) => ({ post: p, year: g.year }))
  ) || [];

  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-destructive flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="font-bold text-lg text-foreground">Memories</h1>
            </div>
          </div>
        </div>

        <div className="max-w-screen-sm mx-auto px-4 py-6">
          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl p-6 mb-6 text-center"
            style={{ background: "var(--gradient-coral)" }}
          >
            {/* Floating decorations */}
            <div className="absolute top-2 left-4 text-2xl animate-bounce opacity-60">✨</div>
            <div className="absolute bottom-3 right-6 text-2xl animate-pulse opacity-60">🦋</div>
            <div className="absolute top-4 right-10 text-lg animate-ping opacity-30">💫</div>

            <Calendar className="h-8 w-8 mx-auto mb-3 text-primary-foreground drop-shadow" />
            <p className="text-xl font-bold text-primary-foreground drop-shadow">
              {format(today, "MMMM d")}
            </p>
            <p className="text-sm text-primary-foreground/80 mt-1">
              {allCards.length > 0
                ? `${allCards.length} memor${allCards.length === 1 ? "y" : "ies"} from this day ✨`
                : "Your memories from this day will appear here"}
            </p>
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[400px] rounded-3xl" />
              ))}
            </div>
          ) : allCards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-12 text-center rounded-3xl border-dashed border-2 border-border">
                <div className="text-5xl mb-4">📸</div>
                <h3 className="font-bold text-xl mb-2 text-foreground">No memories yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Keep posting! Your posts from this day in previous years will appear here as beautiful shareable cards.
                </p>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Carousel navigation */}
              {allCards.length > 1 && (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {allCards.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    disabled={currentIndex === allCards.length - 1}
                    onClick={() => setCurrentIndex((i) => Math.min(allCards.length - 1, i + 1))}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Memory cards */}
              <AnimatePresence mode="wait">
                <MemoryCard
                  key={`${allCards[currentIndex].post.id}-${currentIndex}`}
                  post={allCards[currentIndex].post}
                  yearsAgo={allCards[currentIndex].year}
                  date={format(subYears(today, allCards[currentIndex].year), "MMMM d, yyyy")}
                />
              </AnimatePresence>

              {/* All memories list below */}
              {allCards.length > 1 && (
                <div className="mt-8">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">All Memories</p>
                  <div className="space-y-6">
                    {allCards.map((item, i) => (
                      i !== currentIndex && (
                        <MemoryCard
                          key={item.post.id}
                          post={item.post}
                          yearsAgo={item.year}
                          date={format(subYears(today, item.year), "MMMM d, yyyy")}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Memories;
