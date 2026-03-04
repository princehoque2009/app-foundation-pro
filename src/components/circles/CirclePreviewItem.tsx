import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CirclePreviewItemProps {
  circle: any;
  onOpen: (circle: any) => void;
}

const formatCount = (n: number) => {
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const CirclePreviewItem = ({ circle, onOpen }: CirclePreviewItemProps) => {
  const postCount = circle.posts_count || 0;

  return (
    <button
      onClick={() => onOpen(circle)}
      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
    >
      <Avatar className="h-11 w-11 border border-border/50">
        <AvatarImage src={circle.logo_url} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
          {circle.name?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{circle.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatCount(circle.members_count || 0)} members
          {postCount > 0 && <span className="ml-1">· {postCount} new posts</span>}
        </p>
      </div>
      {postCount > 0 && <div className="h-2.5 w-2.5 rounded-full bg-[#FF5A5F] shrink-0" />}
    </button>
  );
};
