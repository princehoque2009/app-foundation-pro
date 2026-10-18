import founding from "@/assets/anniversary-founding.png";
import star from "@/assets/anniversary-star.png";
import pioneer from "@/assets/anniversary-pioneer.png";
import type { CollectibleId } from "@/lib/anniversaryRules";
export const COLLECTIBLES = [
  { id: "founding" as const, name: "Founding Member", edition: "THE ORIGINALS", image: founding, story: "You were here before the candles. A permanent tribute to the people who believed in Prangon from the beginning.", requirement: "Created your account before October 17, 2026." },
  { id: "star" as const, name: "Anniversary Star", edition: "THE CELEBRATION", image: star, story: "One extraordinary week, one unforgettable community. Carry a little piece of this celebration on your profile.", requirement: "Visit and claim during October 17–23, 2026." },
  { id: "pioneer" as const, name: "Pioneer Creator", edition: "THE FIRST VOICES", image: pioneer, story: "The first stories. The first reels. You turned a new platform into a place worth coming back to.", requirement: "Published a reel or story during October 17, 2025–October 16, 2026." },
];
export function CollectibleArt({ id, className = "" }: { id: CollectibleId; className?: string }) {
  const collectible = COLLECTIBLES.find(item => item.id === id);
  if (!collectible) return null;
  return <img src={collectible.image} alt={collectible.name + " collectible medal"} width={816} height={816} loading="lazy" className={className} draggable={false} />;
}