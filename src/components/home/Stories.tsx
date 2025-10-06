import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

const stories = [
  { id: 1, name: "Your Story", avatar: null, isOwn: true },
  { id: 2, name: "Sarah", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
  { id: 3, name: "John", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150" },
  { id: 4, name: "Emma", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
  { id: 5, name: "Mike", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
  { id: 6, name: "Lisa", avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150" },
];

export const Stories = () => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`relative ${story.isOwn ? "" : "ring-2 ring-primary"} rounded-full p-0.5`}>
            <Avatar className="h-16 w-16 cursor-pointer">
              <AvatarImage src={story.avatar || undefined} alt={story.name} />
              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--olive-dark))] to-[hsl(var(--parrot-green))]">
                {story.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {story.isOwn && (
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                <Plus className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground max-w-[70px] truncate">
            {story.name}
          </span>
        </div>
      ))}
    </div>
  );
};
