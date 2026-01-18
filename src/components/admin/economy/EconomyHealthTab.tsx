import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Gem, Users, TrendingUp, AlertCircle, Gamepad2, Sparkles } from "lucide-react";
import { useEconomyHealth, useVIPAnalytics, useIAPRevenue } from "@/hooks/usePurchaseAnalytics";
import { Progress } from "@/components/ui/progress";

export function EconomyHealthTab() {
  const { data: healthData, isLoading: healthLoading } = useEconomyHealth();
  const { data: vipData, isLoading: vipLoading } = useVIPAnalytics();
  const { data: iapData, isLoading: iapLoading } = useIAPRevenue();

  if (healthLoading || vipLoading || iapLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Real-time economy health metrics and subscription analytics from database.
      </p>

      {/* Currency in Circulation */}
      <div className="grid gap-4 md:grid-cols-4">
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
              In circulation across all users
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
              Premium currency held
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.totalXP.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Experience points earned
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
              Registered profiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Averages */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Balances Per User
            </CardTitle>
            <CardDescription>Based on {healthData?.totalUsers || 0} profiles</CardDescription>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span>Average XP</span>
                </div>
                <span className="font-bold text-lg">
                  {healthData?.avgXP.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Game Activity
            </CardTitle>
            <CardDescription>Engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Total Games Played</span>
                <span className="font-bold text-lg">
                  {healthData?.totalGamesPlayed.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Games (Last 7 days)</span>
                <span className="font-bold text-lg">
                  {healthData?.recentGamesCount.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coins Earned (7 days)</span>
                <span className="font-bold text-lg text-amber-600">
                  ~{healthData?.coinsEarnedRecently.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wealth Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coin Distribution</CardTitle>
            <CardDescription>User balance buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData?.coinBuckets && Object.entries(healthData.coinBuckets).map(([bucket, count]) => {
                const percentage = healthData.totalUsers > 0 
                  ? (count / healthData.totalUsers) * 100 
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

        <Card>
          <CardHeader>
            <CardTitle>Gem Distribution</CardTitle>
            <CardDescription>Premium currency distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData?.gemBuckets && Object.entries(healthData.gemBuckets).map(([bucket, count]) => {
                const percentage = healthData.totalUsers > 0 
                  ? (count / healthData.totalUsers) * 100 
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

      {/* IAP Revenue */}
      {iapData && iapData.totalTransactions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💰 Real Money Revenue (USD)
            </CardTitle>
            <CardDescription>In-app purchase revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${iapData.totalRevenue.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {iapData.totalTransactions}
                </div>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  ${iapData.avgTransactionValue.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Avg Transaction</p>
              </div>
            </div>

            {Object.keys(iapData.revenueByType).length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Revenue by Type</h4>
                <div className="space-y-2">
                  {Object.entries(iapData.revenueByType).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="secondary">${amount.toFixed(2)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VIP Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👑 VIP Subscriptions
          </CardTitle>
          <CardDescription>Premium membership stats from vip_subscriptions table</CardDescription>
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

          {vipData?.tierDistribution && Object.keys(vipData.tierDistribution).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Tier Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(vipData.tierDistribution).map(([tier, count]) => (
                  <Badge key={tier} variant="outline" className="capitalize">
                    {tier}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {vipData?.daysDistribution && Object.keys(vipData.daysDistribution).length > 0 && (
            <div className="mt-4">
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

          {vipData?.platformDistribution && Object.keys(vipData.platformDistribution).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-3">Platform Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(vipData.platformDistribution).map(([platform, count]) => (
                  <Badge key={platform} variant="outline" className="capitalize">
                    {platform}: {count}
                  </Badge>
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
          <CardDescription>Automated analysis based on actual data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Coin Inflation Risk</p>
                <p className="text-sm text-muted-foreground">
                  Based on avg balance of {healthData?.avgCoins.toLocaleString() || 0} coins
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
                  Average {healthData?.avgGems || 0} gems per user
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
                  {vipData?.totalActive || 0} active out of {healthData?.totalUsers || 0} users
                </p>
              </div>
              {healthData && vipData && healthData.totalUsers > 0 && 
               ((vipData.totalActive / healthData.totalUsers) * 100) > 5 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">Good</Badge>
              ) : healthData && vipData && healthData.totalUsers > 0 &&
                   ((vipData.totalActive / healthData.totalUsers) * 100) > 1 ? (
                <Badge variant="outline">Average</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-600">Low</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Recent Engagement</p>
                <p className="text-sm text-muted-foreground">
                  {healthData?.recentGamesCount || 0} games played in last 7 days
                </p>
              </div>
              {healthData && healthData.recentGamesCount > 1000 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">High</Badge>
              ) : healthData && healthData.recentGamesCount > 100 ? (
                <Badge variant="outline">Moderate</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-600">Low</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}