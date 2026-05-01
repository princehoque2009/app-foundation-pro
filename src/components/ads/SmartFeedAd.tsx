import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartFeedAdProps {
  className?: string;
  placement?: "home_feed" | "circles" | "stories" | "explore" | "profile";
}

export const SmartFeedAd = ({ className, placement = "home_feed" }: SmartFeedAdProps) => {
  const queryClient = useQueryClient();

  const { data: ad, isLoading } = useQuery({
    queryKey: ["active-feed-ad", placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("is_active", true)
        .limit(20);

      if (error) throw error;

      const now = Date.now();
      const eligibleAds = (data || []).filter((item) => {
        const startsOk = !item.start_date || new Date(item.start_date).getTime() <= now;
        const endsOk = !item.end_date || new Date(item.end_date).getTime() >= now;
        const matchesPlacement = Array.isArray(item.target_content_types)
          ? item.target_content_types.includes(placement)
          : false;

        return startsOk && endsOk && matchesPlacement;
      });

      if (eligibleAds.length === 0) return null;

      return eligibleAds[Math.floor(Math.random() * eligibleAds.length)];
    },
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });

  // Real-time subscription for ad updates
  useEffect(() => {
    const channel = supabase
      .channel("advertisements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "advertisements" },
        () => {
          // Invalidate all ad queries to refresh instantly
          queryClient.invalidateQueries({ queryKey: ["active-feed-ad"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Track impression
  const impressionMutation = useMutation({
    mutationFn: async (adId: string) => {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        event_type: "impression",
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    },
  });

  // Track click
  const clickMutation = useMutation({
    mutationFn: async (adId: string) => {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        event_type: "click",
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    },
  });

  useEffect(() => {
    if (ad?.id) {
      impressionMutation.mutate(ad.id);
    }
  }, [ad?.id]);

  const handleClick = () => {
    if (ad?.id) clickMutation.mutate(ad.id);
    if (ad?.target_url) window.open(ad.target_url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden border-border/50 bg-muted/30", className)}>
        <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/20">
          <Sparkles className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40">Sponsored</span>
        </div>
        <div className="aspect-video bg-muted animate-pulse" />
        <div className="p-4 space-y-2">
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </Card>
    );
  }

  // Hide entirely when no ad is active (no placeholder shown to users)
  if (!ad) {
    return null;
  }

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        "border-primary/20 bg-gradient-to-br from-card to-primary/5",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Sponsored</span>
        </div>
        {ad.target_url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
      </div>

      {ad.media_url && (
        <div className="relative aspect-video bg-muted">
          <img
            src={ad.media_url}
            alt={ad.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-2">{ad.title}</h3>
        {ad.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
        )}
        {ad.target_url && (
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <span>Learn More</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </Card>
  );
};
