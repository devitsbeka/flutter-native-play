import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Gem, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useEconomyHealth, useVIPAnalytics } from "@/hooks/usePurchaseAnalytics";
import { Progress } from "@/components/ui/progress";

export function EconomyHealthTab() {
  const { data: healthData, isLoading: healthLoading } = useEconomyHealth();
  const { data: vipData, isLoading: vipLoading } = useVIPAnalytics();

  if (healthLoading || vipLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Economy health metrics and VIP subscription analytics.
      </p>

      {/* Currency in Circulation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coins</CardTitle>
            <Coins className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.totalCoins.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              In circulation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gems</CardTitle>
            <Gem className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.totalGems.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              In circulation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.totalUsers.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              With profiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Averages */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Balances
            </CardTitle>
            <CardDescription>Per user averages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span>Average Coins</span>
                </div>
                <span className="font-bold text-lg">
                  {healthData?.avgCoins.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem className="w-5 h-5 text-blue-500" />
                  <span>Average Gems</span>
                </div>
                <span className="font-bold text-lg">
                  {healthData?.avgGems.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wealth Distribution</CardTitle>
            <CardDescription>Coin balance buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData?.wealthBuckets && Object.entries(healthData.wealthBuckets).map(([bucket, count]) => {
                const percentage = healthData.totalUsers > 0 
                  ? ((count as number) / healthData.totalUsers) * 100 
                  : 0;
                return (
                  <div key={bucket} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{bucket}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIP Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👑 VIP Subscriptions
          </CardTitle>
          <CardDescription>Premium membership stats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {vipData?.totalActive || 0}
              </div>
              <p className="text-sm text-muted-foreground">Active VIPs</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-muted-foreground">
                {vipData?.totalExpired || 0}
              </div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {vipData?.churnRate.toFixed(1) || 0}%
              </div>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {(100 - (vipData?.churnRate || 0)).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Retention</p>
            </div>
          </div>

          {vipData?.daysDistribution && Object.keys(vipData.daysDistribution).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Subscription Expiry Distribution</h4>
              <div className="space-y-2">
                {Object.entries(vipData.daysDistribution).map(([bucket, count]) => (
                  <div key={bucket} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{bucket}</span>
                    <Badge variant={bucket === "1-7 days" ? "destructive" : "secondary"}>
                      {count} users
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Economy Health Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Coin Inflation Risk</p>
                <p className="text-sm text-muted-foreground">
                  Based on average coin balance vs. game stake
                </p>
              </div>
              {healthData && healthData.avgCoins > 10000 ? (
                <Badge variant="destructive">High</Badge>
              ) : healthData && healthData.avgCoins > 5000 ? (
                <Badge variant="outline" className="border-amber-500 text-amber-600">Medium</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700">Low</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Gem Scarcity</p>
                <p className="text-sm text-muted-foreground">
                  Average gems per user
                </p>
              </div>
              {healthData && healthData.avgGems < 5 ? (
                <Badge variant="destructive">Scarce</Badge>
              ) : healthData && healthData.avgGems < 20 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">Healthy</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-600">Abundant</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">VIP Adoption</p>
                <p className="text-sm text-muted-foreground">
                  Percentage of users with VIP
                </p>
              </div>
              {healthData && vipData && ((vipData.totalActive / healthData.totalUsers) * 100) > 5 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">Good</Badge>
              ) : (
                <Badge variant="outline">Low</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
