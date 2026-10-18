import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Layers, Rocket } from "lucide-react";
import { dismissAnniversaryModal } from "@/lib/anniversary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import sculpture from "@/assets/anniversary-sculpture.jpg";

export const AnniversaryModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const close = () => { dismissAnniversaryModal(); onClose(); };
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="edition-announcement">
    <div className="edition-announcement-art"><img src={sculpture} alt="Prangon 2.0 anniversary glass sculpture" width={1536} height={1024} /><span className="edition-eyebrow">THE ANNIVERSARY EDITION</span></div>
    <div className="edition-announcement-copy"><span className="edition-eyebrow">OCTOBER 17–23 · SEVEN DAYS ONLY</span><DialogTitle className="edition-announcement-title">PRANGON v2.0</DialogTitle><DialogDescription>One year of moments. One extraordinary community. This celebration belongs to all of us.</DialogDescription>
    <div className="edition-journey">{[[Rocket,"An idea became a home","A space for authentic connection."],[Layers,"You made it come alive","Stories, reels, circles and conversations."],[Heart,"Our next chapter starts here","Your memories. Your collectibles. Your future."]].map(([Icon,title,text]) => { const JourneyIcon = Icon as typeof Heart; return <div key={String(title)}><JourneyIcon /><div><strong>{String(title)}</strong><p>{String(text)}</p></div></div>; })}</div>
    <p className="edition-announcement-thanks">With special thanks to <strong>Shohail Mahmud · @s09_dev</strong>, our second developer.</p>
    <Button className="edition-primary w-full" onClick={() => { close(); navigate("/anniversary"); }}>Enter the celebration <ArrowRight /></Button><Button variant="ghost" className="w-full" onClick={close}>Back to Prangon</Button></div>
  </DialogContent></Dialog>;
};
