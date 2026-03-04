import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CirclePreviewItemProps {
  circle: any;
  onOpen: (circle: any) => void;
}

export const CirclePreviewItem = ({ circle, onOpen }: CirclePreviewItemProps) => {
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
          {circle.members_count || 0} members
        </p>
      </div>
      <div className="h-2 w-2 rounded-full bg-[#FF5A5F] shrink-0" />
    </button>
  );
};
