import { Eye, TrendingUp, TrendingDown, Heart, Share2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface InsightMetric {
  label: string;
  value: number;
  change: number;
  icon: React.ReactNode;
}

interface LiveInsightsProps {
  profileViews: number;
  profileViewsChange: number;
  contentReach: number;
  contentReachChange: number;
  totalReactions: number;
  reactionsChange: number;
  totalShares: number;
  sharesChange: number;
}

export const LiveInsights = ({
  profileViews = 0,
  profileViewsChange = 0,
  contentReach = 0,
  contentReachChange = 0,
  totalReactions = 0,
  reactionsChange = 0,
  totalShares = 0,
  sharesChange = 0,
}: LiveInsightsProps) => {
  const metrics: InsightMetric[] = [
    {
      label: "Profile Views",
      value: profileViews,
      change: profileViewsChange,
      icon: <Eye className="h-5 w-5" />,
    },
    {
      label: "Content Reach",
      value: contentReach,
      change: contentReachChange,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Reactions",
      value: totalReactions,
      change: reactionsChange,
      icon: <Heart className="h-5 w-5" />,
    },
    {
      label: "Shares",
      value: totalShares,
      change: sharesChange,
      icon: <Share2 className="h-5 w-5" />,
    },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Live Insights
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">
            Private
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-muted/50 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {metric.icon}
                <span className="text-xs font-medium">{metric.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(metric.value)}
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    metric.change >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {metric.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(metric.change)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Updated in real-time • Only visible to you
        </p>
      </CardContent>
    </Card>
  );
};
