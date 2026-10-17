import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Rocket, Heart, Gift, Clock, BadgeCheck, PartyPopper } from "lucide-react";
import { anniversaryTimeLeft, dismissAnniversaryModal } from "@/lib/anniversary";

const JOURNEY = [
  { icon: Rocket, title: "The Launch", text: "Prangon began as a bold idea: a social home that feels personal, fast and alive." },
  { icon: Heart, title: "A Community Grew", text: "Circles, stories, reels, real-time chat — built feature by feature with your feedback." },
  { icon: Sparkles, title: "v2.0 Anniversary", text: "A refined, premium experience celebrating everyone who built and believed in Prangon." },
];

const PROGRESS = [
  { label: "Intelligent home feed", status: "done" },
  { label: "Circles & private communities", status: "done" },
  { label: "Reels & stories engine", status: "done" },
  { label: "Real-time messaging & calls", status: "done" },
  { label: "Anniversary collectibles", status: "live" },
  { label: "Prangon Wrapped", status: "live" },
  { label: "Time Capsule", status: "soon" },
  { label: "Creator studio upgrades", status: "soon" },
];

const StatusChip = ({ status }: { status: string }) => {
  if (status === "done")
    return <span className="ann-chip ann-chip-done">Shipped</span>;
  if (status === "live")
    return <span className="ann-chip ann-chip-live">Live now</span>;
  return <span className="ann-chip ann-chip-soon">Coming</span>;
};

export const AnniversaryModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const left = anniversaryTimeLeft();

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => {
    setVisible(false);
    dismissAnniversaryModal();
    setTimeout(onClose, 250);
  };

  return (
    <div
      className={`ann-overlay ${visible ? "ann-overlay-in" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Prangon v2.0 Anniversary announcement"
      onClick={close}
    >
      <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} aria-label="Close announcement" className="ann-close">
          <X className="h-4 w-4" />
        </button>

        <div className="ann-hero">
          <div className="ann-hero-glow" />
          <PartyPopper className="h-8 w-8 text-primary" />
          <p className="ann-kicker">7-Day Anniversary Edition</p>
          <h2 className="ann-title">PRANGON <span>v2.0</span></h2>
          <p className="ann-sub">
            One year of building, listening and shipping. This week, Prangon wears its celebration skin — glass, glow and gratitude.
          </p>
          <div className="ann-countdown">
            <Clock className="h-3.5 w-3.5" />
            {left.days}d {left.hours}h left in the celebration
          </div>
        </div>

        <div className="ann-body">
          <section>
            <h3 className="ann-section-title">Our Journey</h3>
            <div className="ann-timeline">
              {JOURNEY.map((step) => (
                <div key={step.title} className="ann-tl-card">
                  <div className="ann-tl-icon"><step.icon className="h-4 w-4" /></div>
                  <div>
                    <p className="ann-tl-title">{step.title}</p>
                    <p className="ann-tl-text">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="ann-section-title">The Road So Far</h3>
            <div className="ann-progress">
              {PROGRESS.map((p) => (
                <div key={p.label} className="ann-progress-row">
                  <span>{p.label}</span>
                  <StatusChip status={p.status} />
                </div>
              ))}
            </div>
          </section>

          <section className="ann-thanks">
            <h3 className="ann-section-title">Special Thanks</h3>
            <div className="ann-thanks-card">
              <div className="ann-thanks-avatar">SM</div>
              <div>
                <p className="ann-tl-title flex items-center gap-1.5">
                  Shohail Mahmud <BadgeCheck className="h-4 w-4 text-primary" />
                </p>
                <p className="ann-tl-text">
                  Our second developer, <span className="text-primary font-medium">@s09_dev</span> — whose craft, late nights and sharp eye helped shape Prangon v2.0. This milestone is yours too.
                </p>
              </div>
            </div>
          </section>

          <section className="ann-collect">
            <Gift className="h-5 w-5 text-primary shrink-0" />
            <p>
              Anniversary collectibles, profile badges, <strong>Prangon Wrapped</strong> and the <strong>Time Capsule</strong> are unlocked all week.
            </p>
          </section>

          <button
            className="ann-cta"
            onClick={() => {
              close();
              setTimeout(() => navigate("/anniversary"), 260);
            }}
          >
            Explore the Anniversary Page
          </button>
        </div>
      </div>
    </div>
  );
};
