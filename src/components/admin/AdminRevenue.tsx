import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Mock revenue data - In production, this would come from Google AdSense API
const dailyRevenueData = [
  { date: "Jan 1", revenue: 45.20, impressions: 12500, cpm: 3.62 },
  { date: "Jan 2", revenue: 52.80, impressions: 14200, cpm: 3.72 },
  { date: "Jan 3", revenue: 48.90, impressions: 13100, cpm: 3.73 },
  { date: "Jan 4", revenue: 61.30, impressions: 16800, cpm: 3.65 },
  { date: "Jan 5", revenue: 55.60, impressions: 15300, cpm: 3.63 },
  { date: "Jan 6", revenue: 67.40, impressions: 18200, cpm: 3.70 },
  { date: "Jan 7", revenue: 72.10, impressions: 19500, cpm: 3.70 },
];

const monthlyRevenueData = [
  { month: "Aug", revenue: 1250, impressions: 340000 },
  { month: "Sep", revenue: 1480, impressions: 398000 },
  { month: "Oct", revenue: 1320, impressions: 356000 },
  { month: "Nov", revenue: 1680, impressions: 452000 },
  { month: "Dec", revenue: 1890, impressions: 510000 },
  { month: "Jan", revenue: 2150, impressions: 580000 },
];

const adTypeData = [
  { name: "Display Ads", value: 45, color: "hsl(var(--primary))" },
  { name: "In-Feed Ads", value: 30, color: "hsl(var(--chart-2))" },
  { name: "Banner Ads", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Video Ads", value: 10, color: "hsl(var(--chart-4))" },
];

export const AdminRevenue = () => {
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualRevenue, setManualRevenue] = useState("");
  const [manualDate, setManualDate] = useState("");

  const todayRevenue = dailyRevenueData[dailyRevenueData.length - 1].revenue;
  const yesterdayRevenue = dailyRevenueData[dailyRevenueData.length - 2].revenue;
  const revenueChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

  const totalMonthlyRevenue = monthlyRevenueData[monthlyRevenueData.length - 1].revenue;
  const previousMonthRevenue = monthlyRevenueData[monthlyRevenueData.length - 2].revenue;
  const monthlyChange = ((totalMonthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

  const averageCPM = dailyRevenueData.reduce((acc, d) => acc + d.cpm, 0) / dailyRevenueData.length;
  const totalImpressions = dailyRevenueData.reduce((acc, d) => acc + d.impressions, 0);

  const handleManualEntry = () => {
    if (!manualRevenue || !manualDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Revenue entry added",
      description: `$${manualRevenue} added for ${manualDate}`,
    });
    setIsAddingManual(false);
    setManualRevenue("");
    setManualDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Google AdSense performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync AdSense
          </Button>
          <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Revenue Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Revenue (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={manualRevenue}
                    onChange={(e) => setManualRevenue(e.target.value)}
                  />
                </div>
                <Button onClick={handleManualEntry} className="w-full">
                  Add Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">${todayRevenue.toFixed(2)}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${revenueChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {revenueChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(revenueChange).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">${totalMonthlyRevenue.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${monthlyChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {monthlyChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(monthlyChange).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average CPM</p>
                <p className="text-2xl font-bold">${averageCPM.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{(totalImpressions / 1000).toFixed(1)}K</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Revenue</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="distribution">Ad Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Revenue (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Revenue by Ad Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={adTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {adTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {adTypeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AdSense Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Google AdSense Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Publisher ID: ca-pub-3357881453511371</p>
              <p className="text-sm text-muted-foreground">Integration Status</p>
            </div>
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            AdSense script is integrated globally. Ads will appear on Feed, Explore, Search, and Profile pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};