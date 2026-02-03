import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";

export interface PanelActionItem {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  onClick?: () => void;
  badge?: string | number;
  badgeColor?: string;
  disabled?: boolean;
}

interface PanelActionCardsProps {
  actions: PanelActionItem[];
  columns?: 2 | 3 | 4;
  variant?: "grid" | "list";
}

export const PanelActionCards = ({
  actions,
  columns = 2,
  variant = "grid",
}: PanelActionCardsProps) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  if (variant === "list") {
    return (
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                "p-4 transition-all",
                !action.disabled && "cursor-pointer hover:bg-muted/50 hover:shadow-md",
                action.disabled && "opacity-50"
              )}
              onClick={action.disabled ? undefined : action.onClick}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl", action.bgColor || "bg-primary/10")}>
                    <action.icon
                      className={cn("h-5 w-5", action.iconColor || "text-primary")}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action.badge !== undefined && (
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        action.badgeColor || "bg-destructive/10 text-destructive"
                      )}
                    >
                      {action.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", gridCols[columns])}>
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: action.disabled ? 1 : 1.02 }}
          whileTap={{ scale: action.disabled ? 1 : 0.98 }}
        >
          <Card
            className={cn(
              "p-4 h-full transition-all relative overflow-hidden",
              !action.disabled && "cursor-pointer hover:bg-muted/50 hover:shadow-md",
              action.disabled && "opacity-50"
            )}
            onClick={action.disabled ? undefined : action.onClick}
          >
            {action.badge !== undefined && (
              <span
                className={cn(
                  "absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full",
                  action.badgeColor || "bg-destructive/10 text-destructive"
                )}
              >
                {action.badge}
              </span>
            )}
            <div className="flex flex-col items-center text-center gap-3">
              <div className={cn("p-3 rounded-xl", action.bgColor || "bg-primary/10")}>
                <action.icon
                  className={cn("h-6 w-6", action.iconColor || "text-primary")}
                />
              </div>
              <div>
                <h3 className="font-medium text-sm">{action.title}</h3>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
