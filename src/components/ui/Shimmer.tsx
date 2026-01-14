import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
}

export const Shimmer = ({ className }: ShimmerProps) => (
  <div className={cn("shimmer rounded-lg", className)} />
);

export const PostSkeleton = () => (
  <div className="bg-card rounded-2xl p-4 space-y-4 animate-fade-in">
    {/* Header */}
    <div className="flex items-center gap-3">
      <Shimmer className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-20" />
      </div>
    </div>
    {/* Content */}
    <div className="space-y-2">
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-3/4" />
    </div>
    {/* Media */}
    <Shimmer className="h-64 w-full rounded-xl" />
    {/* Actions */}
    <div className="flex gap-4">
      <Shimmer className="h-8 w-16 rounded-full" />
      <Shimmer className="h-8 w-16 rounded-full" />
      <Shimmer className="h-8 w-16 rounded-full" />
    </div>
  </div>
);

export const StorySkeleton = () => (
  <div className="flex gap-4 overflow-hidden px-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-2">
        <Shimmer className="h-16 w-16 rounded-full" />
        <Shimmer className="h-3 w-12" />
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
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-3 w-48" />
        </div>
        <Shimmer className="h-3 w-10" />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Cover & Avatar */}
    <Shimmer className="h-32 w-full" />
    <div className="px-4 -mt-12 flex items-end gap-4">
      <Shimmer className="h-24 w-24 rounded-full border-4 border-background" />
      <div className="flex-1 space-y-2 pb-2">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-4 w-20" />
      </div>
    </div>
    {/* Bio */}
    <div className="px-4 space-y-2">
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-2/3" />
    </div>
    {/* Stats */}
    <div className="flex gap-8 px-4">
      <Shimmer className="h-10 w-16" />
      <Shimmer className="h-10 w-16" />
      <Shimmer className="h-10 w-16" />
    </div>
  </div>
);
