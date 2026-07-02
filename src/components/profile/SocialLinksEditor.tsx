import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SOCIAL_PLATFORMS, SocialLinksMap, SocialPlatform } from "./SocialLinks";
import { cn } from "@/lib/utils";

interface Props {
  value: SocialLinksMap;
  onChange: (next: SocialLinksMap) => void;
}

export const SocialLinksEditor = ({ value, onChange }: Props) => {
  const update = (id: SocialPlatform, v: string) => {
    const next = { ...value };
    if (v.trim()) next[id] = v;
    else delete next[id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Linked accounts</Label>
      <p className="text-xs text-muted-foreground -mt-1">Add your handles or URLs — they'll appear as icons on your profile.</p>
      <div className="grid grid-cols-1 gap-2">
        {SOCIAL_PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full text-white flex items-center justify-center bg-gradient-to-br",
                  p.gradient
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <Input
                value={value[p.id] || ""}
                onChange={(e) => update(p.id, e.target.value)}
                placeholder={p.placeholder}
                className="h-9"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
