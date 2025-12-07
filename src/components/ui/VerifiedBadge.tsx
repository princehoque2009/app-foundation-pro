import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const VerifiedBadge = ({ className, size = "md" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <img
      src="https://i.ibb.co.com/Gv9mNjcT/1000022833-removebg-preview.png"
      alt="Verified"
      className={cn(sizeClasses[size], "object-contain inline-block", className)}
      title="Verified Account"
    />
  );
};
