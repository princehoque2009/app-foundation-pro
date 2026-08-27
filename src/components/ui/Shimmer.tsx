import { cn } from "@/lib/utils";
interface ShimmerProps { className?: string; }
export const Shimmer = ({ className }: ShimmerProps) => (
  <div className={cn("shimmer rounded-xl", className)} />
);
export const PostSkeleton = () => (
  <div className="bg-card rounded-[28px] p-4 space-y-4 border border-border/50 animate-fade-in shadow-sm">
    <div className="flex items-center gap-3">
      <Shimmer className="h-11 w-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32 rounded-full" />
        <Shimmer className="h-3 w-20 rounded-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Shimmer className="h-4 w-full rounded-full" />
      <Shimmer className="h-4 w-3/4 rounded-full" />
    </div>
    <Shimmer className="h-72 w-full rounded-[20px]" />
    <div className="flex gap-2">
      <Shimmer className="h-9 w-20 rounded-full" />
      <Shimmer className="h-9 w-20 rounded-full" />
      <Shimmer className="h-9 w-9 rounded-full ml-auto" />
    </div>
  </div>
);
export const StorySkeleton = () => (
  <div className="flex gap-4 overflow-hidden px-4 py-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-2">
        <Shimmer className="h-[72px] w-[72px] rounded-full" />
        <Shimmer className="h-3 w-12 rounded-full" />
      </div>
    ))}
  </div>
);
export const MessageSkeleton = () => (
  <div className="p-4 space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Shimmer className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-24 rounded-full" />
          <Shimmer className="h-3 w-48 rounded-full" />
        </div>
        <Shimmer className="h-3 w-10 rounded-full" />
      </div>
    ))}
  </div>
);
export const ChatMessageSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className={cn("flex gap-2", i % 3 !== 0 ? "justify-end" : "justify-start")}>
        {i % 3 === 0 && <Shimmer className="h-8 w-8 rounded-full" />}
        <Shimmer className={cn("h-10 rounded-2xl", i % 3 !== 0 ? "w-32 rounded-br-md" : "w-48 rounded-bl-md")} />
      </div>
    ))}
  </div>
);
export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    <Shimmer className="h-40 w-full rounded-none" />
    <div className="px-4 -mt-14 flex items-end gap-4">
      <Shimmer className="h-28 w-28 rounded-full border-4 border-background shadow-md" />
      <div className="flex-1 space-y-2 pb-2">
        <Shimmer className="h-5 w-32 rounded-full" />
        <Shimmer className="h-4 w-20 rounded-full" />
      </div>
    </div>
    <div className="px-4 space-y-2">
      <Shimmer className="h-4 w-full rounded-full" />
      <Shimmer className="h-4 w-2/3 rounded-full" />
    </div>
    <div className="flex gap-8 px-4">
      <Shimmer className="h-10 w-16 rounded-xl" />
      <Shimmer className="h-10 w-16 rounded-xl" />
      <Shimmer className="h-10 w-16 rounded-xl" />
    </div>
  </div>
);
