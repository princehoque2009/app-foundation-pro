import { Youtube, Instagram, Facebook, Twitter, Github, Globe, Music2, AtSign, Linkedin, Twitch } from "lucide-react";
import { cn } from "@/lib/utils";

export type SocialPlatform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "twitter"
  | "threads"
  | "tiktok"
  | "github"
  | "linkedin"
  | "twitch"
  | "website";

export const SOCIAL_PLATFORMS: {
  id: SocialPlatform;
  label: string;
  icon: any;
  placeholder: string;
  gradient: string;
  prefix?: string;
}[] = [
  { id: "youtube", label: "YouTube", icon: Youtube, placeholder: "youtube.com/@channel", gradient: "from-red-500 to-red-600" },
  { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "@username", gradient: "from-fuchsia-500 via-pink-500 to-orange-400" },
  { id: "facebook", label: "Facebook", icon: Facebook, placeholder: "facebook.com/you", gradient: "from-blue-600 to-blue-700" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, placeholder: "@handle", gradient: "from-neutral-800 to-black" },
  { id: "threads", label: "Threads", icon: AtSign, placeholder: "@handle", gradient: "from-neutral-700 to-neutral-900" },
  { id: "tiktok", label: "TikTok", icon: Music2, placeholder: "@handle", gradient: "from-black to-neutral-700" },
  { id: "github", label: "GitHub", icon: Github, placeholder: "github.com/you", gradient: "from-neutral-700 to-neutral-900" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/you", gradient: "from-sky-600 to-blue-700" },
  { id: "twitch", label: "Twitch", icon: Twitch, placeholder: "twitch.tv/you", gradient: "from-purple-500 to-violet-700" },
  { id: "website", label: "Website", icon: Globe, placeholder: "https://you.com", gradient: "from-coral-primary to-coral-accent" },
];

export type SocialLinksMap = Partial<Record<SocialPlatform, string>>;

function toUrl(platform: SocialPlatform, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  switch (platform) {
    case "youtube":
      return v.startsWith("@") ? `https://youtube.com/${v}` : `https://youtube.com/@${v.replace(/^@/, "")}`;
    case "instagram":
      return `https://instagram.com/${v.replace(/^@/, "")}`;
    case "facebook":
      return `https://facebook.com/${v}`;
    case "twitter":
      return `https://x.com/${v.replace(/^@/, "")}`;
    case "threads":
      return `https://threads.net/@${v.replace(/^@/, "")}`;
    case "tiktok":
      return `https://tiktok.com/@${v.replace(/^@/, "")}`;
    case "github":
      return `https://github.com/${v}`;
    case "linkedin":
      return v.includes("/") ? `https://linkedin.com/${v}` : `https://linkedin.com/in/${v}`;
    case "twitch":
      return `https://twitch.tv/${v}`;
    default:
      return `https://${v}`;
  }
}

interface Props {
  links?: SocialLinksMap | null;
  className?: string;
  size?: "sm" | "md";
}

export const SocialLinksDisplay = ({ links, className, size = "md" }: Props) => {
  if (!links) return null;
  const entries = SOCIAL_PLATFORMS.filter((p) => links[p.id]);
  if (entries.length === 0) return null;
  const iconSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {entries.map((p) => {
        const Icon = p.icon;
        const href = toUrl(p.id, links[p.id]!);
        return (
          <a
            key={p.id}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={p.label}
            className={cn(
              "rounded-full text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm",
              `bg-gradient-to-br ${p.gradient}`,
              iconSize
            )}
          >
            <Icon className={icon} />
          </a>
        );
      })}
    </div>
  );
};
