import { LayoutGrid, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ProfileGridPrefs } from "@/hooks/useProfileGridPrefs";

interface GridCustomizeSheetProps {
  prefs: ProfileGridPrefs;
  onUpdate: <K extends keyof ProfileGridPrefs>(key: K, value: ProfileGridPrefs[K]) => void;
  onReset: () => void;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
    {children}
  </div>
);

const Segmented = <T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="inline-flex items-center rounded-full bg-muted p-0.5">
    {options.map((o) => (
      <button
        key={String(o.value)}
        onClick={() => onChange(o.value)}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-full transition-colors",
          value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const GridCustomizeSheet = ({ prefs, onUpdate, onReset }: GridCustomizeSheetProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Customize grid">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold">Customize grid</h4>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onReset}>
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="divide-y">
          <Row label="Columns">
            <Segmented
              value={prefs.columns}
              onChange={(v) => onUpdate("columns", v as 2 | 3 | 4)}
              options={[
                { value: 2, label: "2" },
                { value: 3, label: "3" },
                { value: 4, label: "4" },
              ]}
            />
          </Row>
          <Row label="Spacing">
            <Segmented
              value={prefs.gap}
              onChange={(v) => onUpdate("gap", v as ProfileGridPrefs["gap"])}
              options={[
                { value: "none", label: "None" },
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
              ]}
            />
          </Row>
          <Row label="Shape">
            <Segmented
              value={prefs.shape}
              onChange={(v) => onUpdate("shape", v as ProfileGridPrefs["shape"])}
              options={[
                { value: "square", label: "Square" },
                { value: "portrait", label: "Portrait" },
              ]}
            />
          </Row>
          <Row label="Rounded corners">
            <Switch checked={prefs.rounded} onCheckedChange={(v) => onUpdate("rounded", v)} />
          </Row>
          <Row label="Show likes on hover">
            <Switch checked={prefs.showStats} onCheckedChange={(v) => onUpdate("showStats", v)} />
          </Row>
        </div>
      </PopoverContent>
    </Popover>
  );
};
