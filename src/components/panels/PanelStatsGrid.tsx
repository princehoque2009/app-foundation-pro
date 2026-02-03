import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PanelStatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  highlight?: boolean;
  onClick?: () => void;
}

interface PanelStatsGridProps {
  stats: PanelStatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
}

export const PanelStatsGrid = ({ stats, columns = 4 }: PanelStatsGridProps) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-2 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns])}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          whileHover={{ scale: 1.02 }}
          whileTap={stat.onClick ? { scale: 0.98 } : undefined}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card
            className={cn(
              "p-4 cursor-default transition-all",
              stat.highlight && "ring-2 ring-destructive/50",
              stat.onClick && "cursor-pointer hover:bg-muted/50"
            )}
            onClick={stat.onClick}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
