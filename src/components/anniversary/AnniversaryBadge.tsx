import { Sparkles } from "lucide-react";
import { useAnniversaryClock } from "@/hooks/useAnniversary";

/** Small celebratory chip shown during the v2.0 anniversary window only. */
export const AnniversaryBadge = ({ className = "" }: { className?: string }) => {
  const { active } = useAnniversaryClock();
  if (!active) return null;
  return (
    <span className={`ann-profile-badge ${className}`} title="Prangon v2.0 Anniversary Edition">
      <Sparkles className="h-3 w-3" />
      v2.0
    </span>
  );
};
