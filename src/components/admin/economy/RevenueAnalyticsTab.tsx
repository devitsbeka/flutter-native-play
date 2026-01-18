import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Coins, Gem, ShoppingCart, Users } from "lucide-react";
import { usePurchaseAnalytics } from "@/hooks/usePurchaseAnalytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";

const chartConfig = {
  count: {
    label: "Transactions",
    color: "hsl(var(--primary))",
  },
  gems: {
    label: "Gems Spent",
    color: "hsl(217, 91%, 60%)",
  },
  coins: {
    label: "Coins Spent",
    color: "hsl(45, 93%, 47%)",
  },
} satisfies ChartConfig;

export function RevenueAnalyticsTab() {
  const [days, setDays] = useState(30);
  const { stats, isLoading } = usePurchaseAnalytics(days);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Purchase analytics and revenue metrics.
        </p>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Buyers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueBuyers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Distinct users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gems Spent</CardTitle>
            <Gem className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGemsSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Premium currency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coins Spent</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoinsSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              In-app currency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalUSDRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Real money
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Transactions Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Transactions</CardTitle>
            <CardDescription>Transaction volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyStats}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Currency Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Spending</CardTitle>
            <CardDescription>Gems vs Coins spent daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyStats}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="gems" fill="hsl(217, 91%, 60%)" radius={4} />
                  <Bar dataKey="coins" fill="hsl(45, 93%, 47%)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* By Product Type */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
            <CardDescription>Distribution of purchase types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.transactionsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({((count / stats.totalTransactions) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Currency */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Currency</CardTitle>
            <CardDescription>Gems vs Coins purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.transactionsByCurrency).map(([currency, count]) => (
                <div key={currency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currency === "gems" ? (
                      <Gem className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Coins className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="capitalize">{currency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({((count / stats.totalTransactions) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Latest {stats.recentTransactions.length} purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={tx.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {tx.profile?.nickname?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {tx.profile?.nickname || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize">
                    {tx.product_type}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tx.amount_paid} {tx.currency_used}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
