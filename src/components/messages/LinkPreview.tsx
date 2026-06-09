import { useEffect, useState } from "react";
import { Link as LinkIcon } from "lucide-react";

interface Meta {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  host: string;
}

const cache = new Map<string, Meta | null>();

export const extractFirstUrl = (text?: string | null): string | null => {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
};

export const LinkPreview = ({ url, dark }: { url: string; dark?: boolean }) => {
  const [meta, setMeta] = useState<Meta | null | undefined>(() => cache.get(url));

  useEffect(() => {
    if (cache.has(url)) {
      setMeta(cache.get(url));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (json?.status === "success" && json.data) {
          const d = json.data;
          const m: Meta = {
            title: d.title,
            description: d.description,
            image: d.image?.url,
            url: d.url || url,
            host: new URL(d.url || url).hostname.replace(/^www\./, ""),
          };
          cache.set(url, m);
          if (!cancelled) setMeta(m);
        } else {
          cache.set(url, null);
          if (!cancelled) setMeta(null);
        }
      } catch {
        cache.set(url, null);
        if (!cancelled) setMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (meta === undefined) {
    return (
      <div className={`mt-2 rounded-2xl overflow-hidden ${dark ? "bg-white/15" : "bg-black/5"} animate-pulse h-16 w-full`} />
    );
  }
  if (!meta) return null;

  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-2xl overflow-hidden border ${dark ? "border-white/20 bg-white/10" : "border-border bg-background/60"} hover:opacity-90 transition`}
    >
      {meta.image && (
        <img src={meta.image} alt="" className="w-full h-32 object-cover" loading="lazy" />
      )}
      <div className="p-2.5">
        <div className={`flex items-center gap-1 text-[11px] ${dark ? "text-white/70" : "text-muted-foreground"}`}>
          <LinkIcon className="h-3 w-3" />
          <span className="truncate">{meta.host}</span>
        </div>
        {meta.title && (
          <p className={`text-[13px] font-semibold leading-tight mt-0.5 line-clamp-2 ${dark ? "text-white" : "text-foreground"}`}>
            {meta.title}
          </p>
        )}
        {meta.description && (
          <p className={`text-[12px] mt-0.5 line-clamp-2 ${dark ? "text-white/80" : "text-muted-foreground"}`}>
            {meta.description}
          </p>
        )}
      </div>
    </a>
  );
};
