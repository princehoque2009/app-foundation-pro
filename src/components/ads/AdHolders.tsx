import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { X, ExternalLink, Play, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  ad_type: string;
  media_url: string | null;
  target_url: string | null;
  is_active: boolean;
}

// Hook to fetch active ads by type
const useActiveAds = (adType: string, placement?: string) => {
  return useQuery({
    queryKey: ["active-ads", adType, placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("ad_type", adType)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Advertisement[];
    },
    staleTime: 60000, // Cache for 1 minute
  });
};

// Track ad impression/click
const useAdTracking = () => {
  const trackImpression = useMutation({
    mutationFn: async (adId: string) => {
      // Get current impressions and increment
      const { data: ad } = await supabase
        .from("advertisements")
        .select("impressions")
        .eq("id", adId)
        .single();

      await supabase
        .from("advertisements")
        .update({ impressions: (ad?.impressions || 0) + 1 })
        .eq("id", adId);
      
      // Log analytics
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        event_type: "impression",
        device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    },
  });

  const trackClick = useMutation({
    mutationFn: async (adId: string) => {
      // Get current clicks and increment
      const { data: ad } = await supabase
        .from("advertisements")
        .select("clicks")
        .eq("id", adId)
        .single();

      await supabase
        .from("advertisements")
        .update({ clicks: (ad?.clicks || 0) + 1 })
        .eq("id", adId);

      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        event_type: "click",
        device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });
    },
  });

  return { trackImpression, trackClick };
};

// Banner Ad Component
interface BannerAdProps {
  position?: "top" | "bottom" | "inline";
  className?: string;
}

export const BannerAd = ({ position = "inline", className }: BannerAdProps) => {
  const { data: ads } = useActiveAds("banner");
  const { trackImpression, trackClick } = useAdTracking();
  const [dismissed, setDismissed] = useState(false);
  const impressionTracked = useRef(false);

  const ad = ads?.[0];

  useEffect(() => {
    if (ad && !impressionTracked.current) {
      trackImpression.mutate(ad.id);
      impressionTracked.current = true;
    }
  }, [ad]);

  if (!ad || dismissed) return null;

  const handleClick = () => {
    trackClick.mutate(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-card border border-border cursor-pointer group",
        position === "top" && "mb-4",
        position === "bottom" && "mt-4",
        className
      )}
      onClick={handleClick}
    >
      <div className="absolute top-1 left-1 z-10">
        <span className="text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
          Sponsored
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
      
      {ad.media_url ? (
        <img
          src={ad.media_url}
          alt={ad.title}
          className="w-full h-20 sm:h-24 object-cover"
        />
      ) : (
        <div className="w-full h-20 sm:h-24 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="font-medium text-sm">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-1">{ad.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Carousel Ad Component
interface CarouselAdProps {
  className?: string;
}

export const CarouselAd = ({ className }: CarouselAdProps) => {
  const { data: ads } = useActiveAds("carousel");
  const { trackImpression, trackClick } = useAdTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const impressionTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (ads?.[currentIndex] && !impressionTracked.current.has(ads[currentIndex].id)) {
      trackImpression.mutate(ads[currentIndex].id);
      impressionTracked.current.add(ads[currentIndex].id);
    }
  }, [ads, currentIndex]);

  if (!ads || ads.length === 0) return null;

  const handlePrev = () => setCurrentIndex((i) => (i - 1 + ads.length) % ads.length);
  const handleNext = () => setCurrentIndex((i) => (i + 1) % ads.length);
  const ad = ads[currentIndex];

  const handleClick = () => {
    trackClick.mutate(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
          Sponsored
        </span>
      </div>

      <Card className="overflow-hidden cursor-pointer" onClick={handleClick}>
        <CardContent className="p-0">
          {ad.media_url ? (
            <img
              src={ad.media_url}
              alt={ad.title}
              className="w-full h-40 object-cover"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <p className="font-medium">{ad.title}</p>
            </div>
          )}
          <div className="p-3">
            <p className="font-medium text-sm">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {ad.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {ads.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1">
            {ads.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Native Ad Component (for feed/chat list)
interface NativeAdProps {
  context?: "feed" | "chat" | "panel";
  className?: string;
}

export const NativeAd = ({ context = "feed", className }: NativeAdProps) => {
  const { data: ads } = useActiveAds("feed");
  const { trackImpression, trackClick } = useAdTracking();
  const impressionTracked = useRef(false);

  const ad = ads?.[0];

  useEffect(() => {
    if (ad && !impressionTracked.current) {
      trackImpression.mutate(ad.id);
      impressionTracked.current = true;
    }
  }, [ad]);

  if (!ad) return null;

  const handleClick = () => {
    trackClick.mutate(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  return (
    <Card
      className={cn("overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors", className)}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground mb-2">Sponsored</div>
        <div className="flex gap-3">
          {ad.media_url && (
            <img
              src={ad.media_url}
              alt={ad.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {ad.description}
              </p>
            )}
            {ad.target_url && (
              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                <ExternalLink className="h-3 w-3" />
                Learn more
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Interstitial Ad Component (Full screen)
interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterstitialAd = ({ isOpen, onClose }: InterstitialAdProps) => {
  const { data: ads } = useActiveAds("interstitial");
  const { trackImpression, trackClick } = useAdTracking();
  const [countdown, setCountdown] = useState(5);
  const impressionTracked = useRef(false);

  const ad = ads?.[0];

  useEffect(() => {
    if (isOpen && ad && !impressionTracked.current) {
      trackImpression.mutate(ad.id);
      impressionTracked.current = true;
    }
  }, [isOpen, ad]);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      impressionTracked.current = false;
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !ad) return null;

  const handleClick = () => {
    trackClick.mutate(ad.id);
    if (ad.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="text-xs text-muted-foreground">Sponsored</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={countdown > 0}
        >
          {countdown > 0 ? `Skip in ${countdown}s` : "Close"}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4" onClick={handleClick}>
        {ad.media_url ? (
          <img
            src={ad.media_url}
            alt={ad.title}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{ad.title}</h2>
            {ad.description && (
              <p className="text-muted-foreground">{ad.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border text-center">
        <p className="font-medium">{ad.title}</p>
        {ad.target_url && (
          <Button className="mt-2" onClick={handleClick}>
            Learn More
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Rewarded Ad Component
interface RewardedAdProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: () => void;
  rewardDescription?: string;
}

export const RewardedAd = ({
  isOpen,
  onClose,
  onRewardEarned,
  rewardDescription = "Unlock premium content",
}: RewardedAdProps) => {
  const { data: ads } = useActiveAds("rewarded");
  const { trackImpression, trackClick } = useAdTracking();
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const impressionTracked = useRef(false);

  const ad = ads?.[0];

  useEffect(() => {
    if (isOpen && ad && !impressionTracked.current) {
      trackImpression.mutate(ad.id);
      impressionTracked.current = true;
    }
  }, [isOpen, ad]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCompleted(false);
      impressionTracked.current = false;
      return;
    }

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setCompleted(true);
          return 100;
        }
        return p + 2; // 5 seconds total (2% every 100ms)
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClaim = () => {
    if (ad) {
      trackClick.mutate(ad.id);
    }
    onRewardEarned();
    onClose();
  };

  if (!isOpen || !ad) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Watch to {rewardDescription}</h2>
            <p className="text-muted-foreground text-sm">
              Complete this short ad to claim your reward
            </p>
          </div>

          {ad.media_url && (
            <div className="relative rounded-lg overflow-hidden mb-4">
              <img
                src={ad.media_url}
                alt={ad.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-12 w-12 text-white" />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleClaim}
                disabled={!completed}
              >
                {completed ? "Claim Reward" : `${Math.ceil((100 - progress) / 20)}s remaining`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
