import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/seo/Seo";
import { anniversaryTimeLeft, isAnniversaryActive } from "@/lib/anniversary";
import { Sparkles, Clock, Gift, BadgeCheck, Share2, Hourglass, Award, Rocket, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BADGES = [
  { name: "Founding Member", desc: "Joined during the first era of Prangon.", icon: Award },
  { name: "Anniversary Star", desc: "Active during the v2.0 celebration week.", icon: Sparkles },
  { name: "Circle Keeper", desc: "Built and grew a Circle community.", icon: Heart },
  { name: "Pioneer Creator", desc: "Published reels and stories in year one.", icon: Rocket },
];

const Anniversary = () => {
  const active = isAnniversaryActive();
  const left = anniversaryTimeLeft();

  const share = async () => {
    const url = `${window.location.origin}/anniversary`;
    const text = "Celebrate PRANGON v2.0 — the 7-day Anniversary Edition!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "PRANGON v2.0", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Share the anniversary page with your friends." });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <MainLayout>
      <Seo
        title="PRANGON v2.0 — Anniversary Edition"
        description="Celebrate one year of Prangon: anniversary badges, Prangon Wrapped, Time Capsule and the story of how we built it."
        path="/anniversary"
      />
      <div className="ann-page">
        <header className="ann-page-hero">
          <div className="ann-hero-glow" />
          <Sparkles className="h-9 w-9 text-primary" />
          <h1 className="ann-title">PRANGON <span>v2.0</span></h1>
          <p className="ann-sub">The 7-Day Anniversary Edition — a celebration of everyone who built and believed in Prangon.</p>
          {active && (
            <div className="ann-countdown">
              <Clock className="h-3.5 w-3.5" />
              {left.days} days {left.hours} hours remaining
            </div>
          )}
          <button onClick={share} className="ann-cta ann-cta-inline">
            <Share2 className="h-4 w-4" /> Share the celebration
          </button>
        </header>

        <section className="ann-page-section">
          <h2 className="ann-section-title">Anniversary Collectibles</h2>
          <div className="ann-badge-grid">
            {BADGES.map((b) => (
              <div key={b.name} className="ann-badge-card">
                <div className="ann-tl-icon"><b.icon className="h-4 w-4" /></div>
                <p className="ann-tl-title">{b.name}</p>
                <p className="ann-tl-text">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ann-page-section ann-split">
          <div className="ann-feature-card">
            <Gift className="h-6 w-6 text-primary" />
            <h3>Prangon Wrapped</h3>
            <p>Your year in moments — top posts, closest circles and the friends you talked to most. A personal highlight reel of your first year.</p>
          </div>
          <div className="ann-feature-card">
            <Hourglass className="h-6 w-6 text-primary" />
            <h3>Time Capsule</h3>
            <p>Write a note to your future self. Sealed today, opened on the next anniversary. Some things are worth waiting for.</p>
          </div>
        </section>

        <section className="ann-page-section">
          <h2 className="ann-section-title">Special Thanks</h2>
          <div className="ann-thanks-card">
            <div className="ann-thanks-avatar">SM</div>
            <div>
              <p className="ann-tl-title flex items-center gap-1.5">
                Shohail Mahmud <BadgeCheck className="h-4 w-4 text-primary" />
              </p>
              <p className="ann-tl-text">
                To our second developer, <span className="text-primary font-medium">@s09_dev</span>: thank you for the craft, the patience and the belief. Prangon v2.0 carries your fingerprints everywhere.
              </p>
            </div>
          </div>
        </section>

        <footer className="ann-page-footer">
          <p>Built with love by the Prangon team. Here's to year two.</p>
        </footer>
      </div>
    </MainLayout>
  );
};

export default Anniversary;
