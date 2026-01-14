import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartFeedAdProps {
  className?: string;
}

export const SmartFeedAd = ({ className }: SmartFeedAdProps) => {
  // Fetch a random active ad
  const { data: ad, isLoading } = useQuery({
    queryKey: ["active-feed-ad"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("is_active", true)
        .eq("ad_type", "feed")
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .limit(5);

      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      // Return random ad from results
      return data[Math.floor(Math.random() * data.length)];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track impression
  const impressionMutation = useMutation({
    mutationFn: async (adId: string) => {
      // Direct update for impressions
      await supabase
        .from("advertisements")
        .update({ impressions: (ad?.impressions || 0) + 1 })
        .eq("id", adId);
    },
  });

  // Track click
  const clickMutation = useMutation({
    mutationFn: async (adId: string) => {
      const { error } = await supabase
        .from("advertisements")
        .update({ clicks: (ad?.clicks || 0) + 1 })
        .eq("id", adId);
      
      // Also log to analytics
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        event_type: "click",
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    },
  });

  // Track impression when ad is displayed
  useEffect(() => {
    if (ad?.id) {
      impressionMutation.mutate(ad.id);
      
      // Log impression to analytics
      supabase.from("ad_analytics").insert({
        ad_id: ad.id,
        event_type: "impression",
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    }
  }, [ad?.id]);

  const handleClick = () => {
    if (ad?.id) {
      clickMutation.mutate(ad.id);
    }
    if (ad?.target_url) {
      window.open(ad.target_url, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoading || !ad) {
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
      {/* Sponsored label */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Sponsored</span>
        </div>
        {ad.target_url && (
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* Ad Media */}
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

      {/* Ad Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-2">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ad.description}
          </p>
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
