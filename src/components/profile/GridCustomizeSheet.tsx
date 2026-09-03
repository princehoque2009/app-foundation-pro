import { LayoutGrid, RotateCcw, Rows3, Grid3x3, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProfileGridPrefs } from "@/hooks/useProfileGridPrefs";

interface GridCustomizeSheetProps {
  prefs: ProfileGridPrefs;
  onUpdate: <K extends keyof ProfileGridPrefs>(key: K, value: ProfileGridPrefs[K]) => void;
  onReset: () => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="py-4 first:pt-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">{title}</p>
    {children}
  </div>
);

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="min-w-0">
      <p className="text-sm font-medium leading-tight">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{hint}</p>}
    </div>
    {children}
  </div>
);

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  full,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-full bg-muted p-0.5", full && "w-full")}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
            full && "flex-1",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small live preview of the resulting grid. */
const Preview = ({ prefs }: { prefs: ProfileGridPrefs }) => {
  const gap = { none: "gap-[2px]", xs: "gap-1", sm: "gap-1.5", md: "gap-2", lg: "gap-3" }[prefs.gap];
  const radius = { none: "rounded-none", sm: "rounded-[4px]", md: "rounded-md", lg: "rounded-xl" }[prefs.radius];
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" }[prefs.columns];
  const aspect =
    prefs.shape === "portrait"
      ? "aspect-[3/4]"
      : prefs.shape === "landscape"
        ? "aspect-[4/3]"
        : "aspect-square";

  return (
    <div className="rounded-2xl border bg-muted/30 p-3">
      <div className={cn("grid", cols, gap)}>
        {Array.from({ length: prefs.columns * 2 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-gradient-to-br from-muted-foreground/25 to-muted-foreground/10",
              prefs.layout === "masonry" && i % 3 === 1 ? "aspect-[3/4]" : aspect,
              radius
            )}
          />
        ))}
      </div>
    </div>
  );
};

export const GridCustomizeSheet = ({ prefs, onUpdate, onReset }: GridCustomizeSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Customize grid">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[88vh]">
        <SheetHeader className="px-5 pt-5 pb-3 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">Customize grid</SheetTitle>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </SheetHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-5 pb-8">
            <Preview prefs={prefs} />

            <div className="divide-y">
              <Section title="Layout">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "grid" as const, label: "Uniform grid", icon: Grid3x3 },
                    { id: "masonry" as const, label: "Masonry", icon: Rows3 },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => onUpdate("layout", id)}
                      className={cn(
                        "relative rounded-2xl border p-3 text-left transition-colors",
                        prefs.layout === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-4 w-4 mb-1.5" />
                      <p className="text-xs font-medium">{label}</p>
                      {prefs.layout === id && (
                        <Check className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Structure">
                <Row label="Columns">
                  <Segmented
                    value={prefs.columns}
                    onChange={(v) => onUpdate("columns", v as ProfileGridPrefs["columns"])}
                    options={[
                      { value: 2, label: "2" },
                      { value: 3, label: "3" },
                      { value: 4, label: "4" },
                      { value: 5, label: "5" },
                    ]}
                  />
                </Row>
                <Row label="Spacing">
                  <Segmented
                    value={prefs.gap}
                    onChange={(v) => onUpdate("gap", v as ProfileGridPrefs["gap"])}
                    options={[
                      { value: "none", label: "0" },
                      { value: "xs", label: "XS" },
                      { value: "sm", label: "S" },
                      { value: "md", label: "M" },
                      { value: "lg", label: "L" },
                    ]}
                  />
                </Row>
                <Row label="Tile shape" hint={prefs.layout === "masonry" ? "Ignored in masonry" : undefined}>
                  <Segmented
                    value={prefs.shape}
                    onChange={(v) => onUpdate("shape", v as ProfileGridPrefs["shape"])}
                    options={[
                      { value: "square", label: "1:1" },
                      { value: "portrait", label: "3:4" },
                      { value: "landscape", label: "4:3" },
                    ]}
                  />
                </Row>
                <Row label="Corners">
                  <Segmented
                    value={prefs.radius}
                    onChange={(v) => onUpdate("radius", v as ProfileGridPrefs["radius"])}
                    options={[
                      { value: "none", label: "Sharp" },
                      { value: "sm", label: "S" },
                      { value: "md", label: "M" },
                      { value: "lg", label: "L" },
                    ]}
                  />
                </Row>
              </Section>

              <Section title="Overlays">
                <Row label="Show stats" hint="Likes shown over each tile">
                  <Segmented
                    value={prefs.overlay}
                    onChange={(v) => onUpdate("overlay", v as ProfileGridPrefs["overlay"])}
                    options={[
                      { value: "hover", label: "On hover" },
                      { value: "always", label: "Always" },
                      { value: "never", label: "Never" },
                    ]}
                  />
                </Row>
                <Row label="Caption preview" hint="First line of the caption on each tile">
                  <Switch checked={prefs.showCaption} onCheckedChange={(v) => onUpdate("showCaption", v)} />
                </Row>
                <Row label="Media type badge" hint="Reel and video indicators">
                  <Switch checked={prefs.showTypeIcon} onCheckedChange={(v) => onUpdate("showTypeIcon", v)} />
                </Row>
                <Row label="Pinned posts first">
                  <Switch checked={prefs.pinnedFirst} onCheckedChange={(v) => onUpdate("pinnedFirst", v)} />
                </Row>
              </Section>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
