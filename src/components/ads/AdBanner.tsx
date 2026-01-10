import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

export const AdBanner = ({ 
  slot = "auto", 
  format = "auto",
  className = "" 
}: AdBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // Only load once per component instance
    if (isLoaded.current) return;
    
    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, []);

  return (
    <div 
      ref={adRef}
      className={`ad-container overflow-hidden ${className}`}
      style={{ minHeight: "100px" }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3357881453511371"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

// In-feed native ad component
export const InFeedAd = ({ className = "" }: { className?: string }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    
    const timer = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.adsbygoogle) {
          window.adsbygoogle.push({});
          isLoaded.current = true;
        }
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      ref={adRef}
      className={`ad-container my-4 rounded-lg overflow-hidden bg-card border border-border ${className}`}
      style={{ minHeight: "250px" }}
    >
      <div className="text-xs text-muted-foreground px-3 py-1 bg-muted/50">
        Sponsored
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-3357881453511371"
        data-ad-slot="5715327616"
      />
    </div>
  );
};