import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpRight, ArrowRight, Check, LockKeyhole, Sparkles, Share2, Heart, Film, MessageCircle, Eye, Download, Mail, Loader2, Image as ImageIcon } from "lucide-react";
import { useAnniversaryClock, useAnniversaryData } from "@/hooks/useAnniversary";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { canEarnCollectible, type CollectibleId } from "@/lib/anniversaryRules";
import { COLLECTIBLES, CollectibleArt } from "@/components/anniversary/CollectibleArt";
import { PhotocardPoster } from "@/components/anniversary/PhotocardPoster";
import sculpture from "@/assets/anniversary-sculpture.jpg";
import { toast } from "@/hooks/use-toast";
import { downloadWrappedPoster, shareWrappedPoster } from "@/lib/wrappedPoster";

const Anniversary = () => {
  const clock = useAnniversaryClock();
  const { wrapped, awards, capsule, claim, seal } = useAnniversaryData();
  const [selected, setSelected] = useState<CollectibleId | null>(null);
  const [showWrapped, setShowWrapped] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const { data: profile } = useCurrentProfile();
  const chosen = COLLECTIBLES.find(c => c.id === selected);
  const stats = wrapped.data;
  const earned = (id: CollectibleId) => awards.data?.some(a => a.badge === id) ?? false;
  const eligible = (id: CollectibleId) => !!stats && canEarnCollectible(id, Date.parse(stats.joined_at), stats.reels + stats.stories, clock.now);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "PRANGON v2.0", text: "One year. All of us. Celebrate Prangon.", url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast({ title: "Celebration link copied" }); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast({ title: "Could not share", variant: "destructive" }); }
  };
  const saveRecap = async () => {
    if (!stats || posterBusy) return;
    setPosterBusy(true);
    try {
      await downloadWrappedPoster(stats, profile);
      toast({ title: "Recap saved as PNG" });
    } catch (error) {
      toast({ title: "Could not save recap", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setPosterBusy(false); }
  };
  const shareRecap = async () => {
    if (!stats || posterBusy) return;
    setPosterBusy(true);
    try {
      const result = await shareWrappedPoster(stats, profile);
      if (result === "downloaded") toast({ title: "Recap saved — share it anywhere" });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast({ title: "Could not share recap", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setPosterBusy(false); }
  };
  const wrapSlides = stats ? [
    { label: "YOUR FIRST CHAPTER", value: stats.posts + stats.reels + stats.stories, title: "Moments with your name on them.", detail: `${stats.posts} posts · ${stats.reels} reels · ${stats.stories} recorded stories`, icon: Film },
    { label: "THE LOVE CAME BACK", value: stats.likes, title: "Little hearts. Real connections.", detail: `${stats.comments} comments received across your year-one content`, icon: Heart },
    { label: "YOU MADE AN IMPRESSION", value: stats.views, title: "Your moments were seen.", detail: "Recorded post and reel views during your first chapter", icon: Eye },
  ] : [];
  const slide = wrapSlides[step];
  return <MainLayout>
    <Seo title="PRANGON v2.0 — Anniversary Edition" description="One year. All of us. Earn anniversary collectibles, explore your personal Prangon Wrapped and seal a private Time Capsule." path="/anniversary" />
    <div className="anniversary-page">
      <header className="anniversary-hero">
        <img src={sculpture} alt="Sculptural glass Prangon 2.0 anniversary edition" width={1536} height={1024} className="anniversary-hero-art" />
        <div className="anniversary-hero-copy">
          <span className="edition-eyebrow">ALL OCTOBER 2026 · YEAR ONE</span>
          <h1>PRANGON <span>v2.0</span></h1>
          <h2>One year.<br />All of us.</h2>
          <p>A celebration of the moments, the first voices, and the people who made this place ours.</p>
          <Button onClick={() => document.getElementById("collectibles")?.scrollIntoView({ behavior: "smooth" })} className="edition-primary">Discover your collectibles <ArrowRight /></Button>
        </div>
        <span className="edition-hero-foot">THE ANNIVERSARY EDITION / 001</span>
      </header>
      <div className="edition-event-strip">
        <div><span className="edition-live-dot" /><strong>{clock.active ? "A whole month. A lasting memory." : "The celebration lives on."}</strong><p>{clock.active ? "All October · Limited-time claims · Permanent collectibles" : "Earned awards and sealed capsules stay with you."}</p></div>
        {clock.active ? <div className="edition-clock">{[[clock.days,"DAYS"],[clock.hours,"HRS"],[clock.minutes,"MIN"],[clock.seconds,"SEC"]].map(([value,label]) => <div key={label}><strong>{String(value).padStart(2,"0")}</strong><span>{label}</span></div>)}</div> : <span className="edition-tag">EVENT COMPLETE</span>}
      </div>
      <nav className="edition-nav" aria-label="Anniversary sections"><a href="#collectibles">Collectibles</a><a href="#wrapped">Your Wrapped</a><a href="#photocard">Photocard</a><a href="#capsule">Time Capsule</a><Button variant="ghost" size="icon" aria-label="Share anniversary" title="Share anniversary" onClick={share}><Share2 /></Button></nav>
      <section id="collectibles" className="edition-section">
        <div className="edition-section-heading"><div><span className="edition-eyebrow">KEEP A PIECE OF YEAR ONE</span><h2>Anniversary Collectibles</h2></div><span className="edition-count">{awards.data?.length ?? 0} / 3 collected</span></div>
        <p className="edition-intro">Not just a badge. Your part in our story, made permanent.</p>
        {(awards.error || wrapped.error) && <p role="alert" className="edition-error">{(awards.error || wrapped.error)?.message} <Button variant="link" onClick={() => { awards.refetch(); wrapped.refetch(); }}>Retry</Button></p>}
        <div className="edition-collectibles">{COLLECTIBLES.map((c, i) => <article className={`edition-collectible edition-${c.id}`} key={c.id}>
          <div className="edition-card-top"><span>NO. 00{i+1}</span><span>{earned(c.id) ? "COLLECTED" : "ANNIVERSARY EXCLUSIVE"}</span></div>
          <CollectibleArt id={c.id} className="edition-medal" />
          <span className="edition-eyebrow">{c.edition}</span><h3>{c.name}</h3><p>{c.story}</p>
          <div className="edition-requirement"><Check className="h-4 w-4" /><span>{c.requirement}</span></div>
          <Button variant="outline" className="edition-card-button" onClick={() => { claim.reset(); setSelected(c.id); }}>{earned(c.id) ? <><Check /> View your collectible</> : <>Explore collectible <ArrowUpRight /></>}</Button>
        </article>)}</div>
      </section>
      <section id="wrapped" className="edition-section edition-wrapped-section">
        <div className="edition-wrapped-art" aria-hidden="true"><span>YOUR</span><strong>20<br />26</strong><span>YEAR, REPLAYED.</span></div>
        <div className="edition-feature-copy"><span className="edition-eyebrow">A YEAR THAT COULD ONLY BE YOURS</span><h2>Prangon Wrapped</h2><p>The moments you shared. The love you received. A personal look back at your first chapter on Prangon.</p>
          <div className="edition-mini-stats">{[[Film,stats?.posts,"Posts"],[Heart,stats?.likes,"Likes"],[MessageCircle,stats?.comments,"Comments"]].map(([Icon,value,label]) => { const StatIcon = Icon as typeof Film; return <div key={String(label)}><StatIcon /><strong>{typeof value === "number" ? value.toLocaleString() : "—"}</strong><span>{String(label)}</span></div>; })}</div>
          <Button className="edition-primary" disabled={!stats} onClick={() => { setStep(0); setShowWrapped(true); }}>{wrapped.isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />} Open my Wrapped <ArrowUpRight /></Button>
          <small>October 17, 2025 – October 16, 2026 · Based on recorded activity</small>
        </div>
      </section>
      <section id="photocard" className="edition-section edition-photocard-section">
        <div className="edition-feature-copy"><span className="edition-eyebrow">WEAR YOUR YEAR WITH PRIDE</span><h2>Anniversary Photocard</h2><p>Your name, your numbers, your year — turned into a collectible poster. Generate your personalized photocard and share it with the people who were part of it.</p>
          <Button className="edition-primary" onClick={() => setShowPoster(true)}><ImageIcon /> Create my photocard <ArrowUpRight /></Button>
          <small>Generated on your device · Nothing is uploaded</small>
        </div>
        <div className="edition-photocard-art" aria-hidden="true"><span>v2.0</span><strong>PHOTO<br />CARD</strong><span>OCTOBER 2026</span></div>
      </section>
      <section id="capsule" className="edition-section edition-capsule-section">
        <div className="edition-feature-copy"><span className="edition-eyebrow">FOR THE PERSON YOU’LL BECOME</span><h2>Time Capsule</h2><p>A thought. A promise. A little hope for the year ahead. Seal a letter to your future self — and meet it again on our next anniversary.</p><div className="edition-capsule-date"><LockKeyhole /><div><strong>Opens October 17, 2027</strong><span>Private. Just you and your future self.</span></div></div></div>
        <div className="edition-letter">
          {capsule.isLoading ? <Loader2 className="animate-spin" /> : capsule.data ? <><Mail className="edition-letter-icon" /><span className="edition-eyebrow">{capsule.data.message ? "DELIVERED TO YOUR FUTURE SELF" : "SEALED WITH HOPE"}</span><h3>{capsule.data.message ? "Your letter has arrived." : "See you in a year."}</h3>{capsule.data.message ? <p className="whitespace-pre-wrap">{capsule.data.message}</p> : <p>Your words are sealed. No previews, no peeking.<br />Opening on October 17, 2027.</p>}<small>Sealed {new Date(capsule.data.created_at).toLocaleDateString()}</small></> : <><label htmlFor="capsule-message">Dear future me,</label><Textarea id="capsule-message" placeholder="What do you hope to remember a year from now?" value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} disabled={!clock.active} className="edition-letter-input" /><div className="edition-letter-bottom"><span>{message.length} / 2000</span><Button disabled={!clock.active || !message.trim() || capsule.isError} onClick={() => setConfirmSeal(true)}><LockKeyhole /> Seal my capsule</Button></div>{!clock.active && <p>The sealing window has closed.</p>}</>}
          {(capsule.error || seal.error) && <p role="alert" className="edition-error">{(capsule.error || seal.error)?.message}<Button variant="link" onClick={() => capsule.refetch()}>Retry</Button></p>}
        </div>
      </section>
      <section className="edition-section edition-thanks"><span className="edition-eyebrow">BUILT BY PEOPLE. FOR PEOPLE.</span><h2>This milestone is yours, too.</h2><p>Special thanks to <strong>Shohail Mahmud</strong>, our second developer, <strong>@s09_dev</strong>. For the craft, the patience, the late nights, and the belief that brought Prangon v2.0 to life.</p><span className="edition-signature">The Prangon team</span></section>
      <footer className="edition-footer"><span>PRANGON / YEAR ONE</span><span>Here’s to the next chapter.</span><Button variant="ghost" onClick={share}><Share2 /> Share the celebration</Button></footer>
    </div>
    <Dialog open={!!chosen} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="edition-detail-dialog"><DialogTitle>{chosen?.name}</DialogTitle><DialogDescription>{chosen?.requirement}</DialogDescription>{chosen && <><CollectibleArt id={chosen.id} className="edition-detail-medal" /><p>{chosen.story}</p><p className="text-sm text-muted-foreground">Once claimed, this collectible appears on your profile and remains after the celebration ends.</p>{claim.error && <p role="alert" className="edition-error">{claim.error.message}</p>}<Button disabled={earned(chosen.id) || !eligible(chosen.id) || claim.isPending || awards.isLoading || awards.isError} onClick={() => claim.mutate(chosen.id)}>{claim.isPending ? <Loader2 className="animate-spin" /> : earned(chosen.id) ? <Check /> : <Sparkles />}{earned(chosen.id) ? "Collected · On your profile" : !clock.active ? "Claiming has ended" : eligible(chosen.id) ? "Claim collectible" : "Not eligible"}</Button>{!earned(chosen.id) && !eligible(chosen.id) && <small className="text-muted-foreground">Eligibility is based on your recorded account and content history.</small>}</>}</DialogContent></Dialog>
    <Dialog open={showWrapped} onOpenChange={setShowWrapped}><DialogContent className="edition-wrapped-dialog"><DialogTitle>Your Prangon Wrapped</DialogTitle><DialogDescription>Year one · October 2025–October 2026</DialogDescription><div className="edition-story-progress">{wrapSlides.map((_, i) => <span key={i} className={i <= step ? "is-complete" : ""} />)}</div>{slide && <div className="edition-story"><slide.icon /><span className="edition-eyebrow">{slide.label}</span><strong>{slide.value.toLocaleString()}</strong><h3>{slide.title}</h3><p>{slide.detail}</p></div>}{step === 2 && stats?.top_post && <Link className="edition-top-post" to={`/post/${stats.top_post.id}`}><span>Your most-loved post</span><p>{stats.top_post.caption || "A moment worth revisiting"}</p><strong>{stats.top_post.likes ?? 0} likes <ArrowUpRight className="inline h-4 w-4" /></strong></Link>}<div className="flex justify-between gap-2"><Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s-1)}>Previous</Button>{step < 2 ? <Button onClick={() => setStep(s => s+1)}>Next <ArrowRight /></Button> : <div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Share my recap" title="Share my recap" disabled={posterBusy} onClick={shareRecap}>{posterBusy ? <Loader2 className="animate-spin" /> : <Share2 />}</Button><Button disabled={posterBusy} onClick={saveRecap}>{posterBusy ? <Loader2 className="animate-spin" /> : <Download />} Save my recap</Button></div>}</div><small className="text-muted-foreground">Deleted or no longer recorded activity is not included.</small></DialogContent></Dialog>
    <PhotocardPoster open={showPoster} onOpenChange={setShowPoster} name={profile?.display_name ?? ""} username={profile?.username ?? "member"} avatarUrl={profile?.avatar_url ?? null} stats={stats} collectibles={awards.data?.length ?? 0} />
    <Dialog open={confirmSeal} onOpenChange={setConfirmSeal}><DialogContent><DialogTitle>Seal your letter for one year?</DialogTitle><DialogDescription>Once sealed, your letter cannot be edited or viewed until October 17, 2027. Only you can open it.</DialogDescription>{seal.error && <p role="alert" className="edition-error">{seal.error.message}</p>}<Button disabled={seal.isPending || !clock.active} onClick={() => seal.mutate(message, { onSuccess: () => { setConfirmSeal(false); setMessage(""); } })}>{seal.isPending ? <Loader2 className="animate-spin" /> : <LockKeyhole />} Seal until October 17, 2027</Button></DialogContent></Dialog>
  </MainLayout>;
};
export default Anniversary;
