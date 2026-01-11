import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Eye,
  MousePointer,
  BarChart3,
  Download,
  Calendar,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

type TimeRange = "today" | "7days" | "30days" | "90days" | "custom";

interface RevenueMetrics {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  rpm: number;
  impressions: number;
  clicks: number;
  ctr: number;
  pageViews: number;
}

// Mock data generator for demonstration (replace with real AdSense API)
const generateMockData = (days: number) => {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const baseRevenue = 5 + Math.random() * 15;
    const impressions = Math.floor(1000 + Math.random() * 5000);
    const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.03));
    
    data.push({
      date: format(date, "MMM dd"),
      fullDate: format(date, "yyyy-MM-dd"),
      revenue: Number(baseRevenue.toFixed(2)),
      impressions,
      clicks,
      ctr: Number(((clicks / impressions) * 100).toFixed(2)),
      rpm: Number(((baseRevenue / impressions) * 1000).toFixed(2)),
    });
  }
  return data;
};

const placementData = [
  { placement: "Home Feed", impressions: 45000, revenue: 156.78, rpm: 3.48, share: 45 },
  { placement: "Search Results", impressions: 25000, revenue: 87.50, rpm: 3.50, share: 25 },
  { placement: "Profile Pages", impressions: 15000, revenue: 45.00, rpm: 3.00, share: 15 },
  { placement: "Explore Page", impressions: 15000, revenue: 52.50, rpm: 3.50, share: 15 },
];

const pageRevenueData = [
  { name: "Feed", value: 45, color: "hsl(var(--primary))" },
  { name: "Search", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Profile", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Explore", value: 15, color: "hsl(var(--chart-4))" },
];

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  impressions: { label: "Impressions", color: "hsl(var(--chart-2))" },
  clicks: { label: "Clicks", color: "hsl(var(--chart-3))" },
  rpm: { label: "RPM", color: "hsl(var(--chart-4))" },
};

export const AdvancedRevenuePanel = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getDaysFromRange = (range: TimeRange): number => {
    switch (range) {
      case "today": return 1;
      case "7days": return 7;
      case "30days": return 30;
      case "90days": return 90;
      default: return 7;
    }
  };

  const { data: revenueData, refetch } = useQuery({
    queryKey: ["revenue-data", timeRange],
    queryFn: async () => {
      // In production, this would call Google AdSense API
      // For now, using mock data
      const days = getDaysFromRange(timeRange);
      return generateMockData(days);
    },
    staleTime: 5 * 60 * 1000,
  });

  const metrics = useMemo((): RevenueMetrics => {
    if (!revenueData || revenueData.length === 0) {
      return {
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        rpm: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        pageViews: 0,
      };
    }

    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const totalImpressions = revenueData.reduce((sum, d) => sum + d.impressions, 0);
    const totalClicks = revenueData.reduce((sum, d) => sum + d.clicks, 0);
    const todayRevenue = revenueData[revenueData.length - 1]?.revenue || 0;

    return {
      totalRevenue,
      todayRevenue,
      monthlyRevenue: totalRevenue,
      rpm: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      pageViews: Math.floor(totalImpressions * 1.5),
    };
  }, [revenueData]);

  const previousMetrics = useMemo(() => {
    // Calculate change percentages (mock comparison)
    return {
      revenueChange: 12.5,
      impressionsChange: 8.3,
      rpmChange: 3.2,
      ctrChange: -1.5,
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Revenue data refreshed");
  };

  const handleExport = () => {
    if (!revenueData) return;
    
    const csv = [
      ["Date", "Revenue", "Impressions", "Clicks", "CTR", "RPM"].join(","),
      ...revenueData.map(d => 
        [d.fullDate, d.revenue, d.impressions, d.clicks, d.ctr, d.rpm].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prangon-revenue-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    prefix = "",
    suffix = ""
  }: {
    title: string;
    value: number;
    change?: number;
    icon: typeof DollarSign;
    prefix?: string;
    suffix?: string;
  }) => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold">
              {prefix}{typeof value === "number" ? value.toFixed(2) : value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center text-xs ${change >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(change).toFixed(1)}% vs previous
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Google AdSense performance metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          change={previousMetrics.revenueChange}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          title="Today's Revenue"
          value={metrics.todayRevenue}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          title="RPM"
          value={metrics.rpm}
          change={previousMetrics.rpmChange}
          icon={BarChart3}
          prefix="$"
        />
        <StatCard
          title="Impressions"
          value={metrics.impressions}
          change={previousMetrics.impressionsChange}
          icon={Eye}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MousePointer className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Clicks</p>
                <p className="text-lg font-semibold">{metrics.clicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">CTR</p>
                <p className="text-lg font-semibold">{metrics.ctr.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-lg font-semibold">{metrics.pageViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Payout Threshold</p>
                <p className="text-lg font-semibold text-emerald-500">
                  ${Math.min(metrics.totalRevenue, 100).toFixed(0)} / $100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={revenueData || []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Impressions and clicks over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={revenueData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="placements">
          <Card>
            <CardHeader>
              <CardTitle>Ad Placement Performance</CardTitle>
              <CardDescription>Revenue by placement location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placement</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">RPM</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {placementData.map((row) => (
                      <TableRow key={row.placement}>
                        <TableCell className="font-medium">{row.placement}</TableCell>
                        <TableCell className="text-right">{row.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${row.rpm.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.share}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Page</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={pageRevenueData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {pageRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Daily Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={revenueData?.slice(-7) || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AdSense Integration Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="font-medium">Google AdSense Connected</p>
                <p className="text-sm text-muted-foreground">Publisher ID: ca-pub-3357881453511371</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open AdSense
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
