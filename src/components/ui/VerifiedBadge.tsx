import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: string;
}

export const VerifiedBadge = ({ className, size = "md", theme = 'default' }: VerifiedBadgeProps) => {
  const sizeClasses = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const isNitro = theme === 'nitro';
  return (
    <img
      src="https://i.ibb.co.com/Gv9mNjcT/1000022833-removebg-preview.png"
      alt="Verified"
      className={cn(sizeClasses[size], "object-contain inline-block transition-all duration-300", isNitro && "grayscale brightness-75 contrast-125", className)}
      style={isNitro ? { filter: 'grayscale(1) brightness(0.9) contrast(1.2)' } : undefined}
      title={isNitro ? "Verified • Nitro" : "Verified Account"}
    />
  );
};
