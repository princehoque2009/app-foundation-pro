import prangsIconSrc from "@/assets/prangs-icon.png";
import { cn } from "@/lib/utils";

interface PrangsIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export const PrangsIcon = ({ size = "md", className }: PrangsIconProps) => (
  <img
    src={prangsIconSrc}
    alt="Prangs"
    draggable={false}
    className={cn(sizeMap[size], "inline-block object-contain select-none", className)}
  />
);
