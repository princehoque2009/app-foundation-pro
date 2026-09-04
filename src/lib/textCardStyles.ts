import type { TextCardStyle } from "@/hooks/useProfileGridPrefs";

export interface TextCardTheme {
  id: TextCardStyle;
  label: string;
  /** Tile background + text colour classes. */
  card: string;
  /** Typography classes applied to the caption. */
  type: string;
  /** Small swatch used inside the customize sheet. */
  swatch: string;
}

export const TEXT_STYLES: TextCardTheme[] = [
  {
    id: "gradient",
    label: "Aura",
    card: "bg-[linear-gradient(140deg,hsl(var(--primary)/0.95),hsl(var(--primary)/0.55)_45%,hsl(var(--accent)/0.85))] text-primary-foreground",
    type: "font-semibold tracking-tight",
    swatch: "bg-[linear-gradient(140deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground",
  },
  {
    id: "paper",
    label: "Paper",
    card: "bg-card text-foreground ring-1 ring-inset ring-border",
    type: "font-medium",
    swatch: "bg-card text-foreground ring-1 ring-inset ring-border",
  },
  {
    id: "mono",
    label: "Mono",
    card: "bg-foreground text-background",
    type: "font-mono font-medium tracking-tight",
    swatch: "bg-foreground text-background font-mono",
  },
  {
    id: "sticky",
    label: "Sticky",
    card: "bg-[hsl(48_96%_76%)] text-[hsl(24_40%_18%)]",
    type: "font-semibold",
    swatch: "bg-[hsl(48_96%_76%)] text-[hsl(24_40%_18%)]",
  },
];

export const getTextCardTheme = (id: TextCardStyle | undefined): TextCardTheme =>
  TEXT_STYLES.find((s) => s.id === id) ?? TEXT_STYLES[0];

/** Caption length -> font size so short thoughts read big and long ones still fit. */
export const textCardFontClass = (len: number, columns: number) => {
  const scale = columns >= 4 ? 0 : columns === 3 ? 1 : 2;
  if (len <= 40) return ["text-[11px]", "text-[13px]", "text-base"][scale];
  if (len <= 100) return ["text-[10px]", "text-[11px]", "text-sm"][scale];
  return ["text-[9px]", "text-[10px]", "text-xs"][scale];
};
