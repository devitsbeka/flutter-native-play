import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  Database, 
  ShoppingCart, 
  Crown, 
  TrendingUp,
  Clock,
  Eye,
  Activity
} from 'lucide-react';

interface LanguageBucket {
  language: string;
  inProd: number;
  inLib: number;
  total: number;
}

interface RegionalActivity {
  region: string;
  onlineNow: number;
  played24h: number;
  played7d: number;
  played30d: number;
  totalUsers: number;
}

interface Purchase {
  id: string;
  nickname: string;
  tier: string;
  platform: string;
  created_at: string;
  region: string;
}

interface TopCustomer {
  nickname: string;
  region: string;
  value: number | string;
}

interface RegionalMetrics {
  region: string;
  avgAdsPerUser: number;
  avgGamesPerUser: number;
  totalUsers: number;
}

export function PalantirAnalyticsWidget() {
  const [languageBuckets, setLanguageBuckets] = useState<LanguageBucket[]>([]);
  const [regionalActivity, setRegionalActivity] = useState<RegionalActivity[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [purchasesByTier, setPurchasesByTier] = useState<Record<string, number>>({});
  const [topPayingCustomers, setTopPayingCustomers] = useState<TopCustomer[]>([]);
  const [topAdsWatchers, setTopAdsWatchers] = useState<TopCustomer[]>([]);
  const [regionalMetrics, setRegionalMetrics] = useState<RegionalMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchLanguageBuckets(),
      fetchRegionalActivity(),
      fetchPurchases(),
      fetchTopCustomers(),
      fetchRegionalMetrics(),
    ]);
    setLoading(false);
  };

  const fetchLanguageBuckets = async () => {
    // Use count queries to avoid 1000 row limit
    const languages = ['ka', 'en', 'ru', 'de', 'fr'];
    const buckets: LanguageBucket[] = [];

    for (const lang of languages) {
      const { count: inProdCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('language', lang)
        .eq('in_production', true);

      const { count: inLibCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('language', lang)
        .eq('in_production', false);

      const inProd = inProdCount || 0;
      const inLib = inLibCount || 0;

      if (inProd > 0 || inLib > 0) {
        buckets.push({
          language: lang,
          inProd,
          inLib,
          total: inProd + inLib,
        });
      }
    }

    setLanguageBuckets(buckets.sort((a, b) => b.total - a.total));
  };

  const fetchRegionalActivity = async () => {
    // Get all profiles with regions
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, region');

    // Get online users
    const { data: onlineData } = await supabase
      .from('user_presence')
      .select('user_id, status')
      .in('status', ['online', 'away']);

    // Get game sessions for different time periods
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions24h } = await supabase
      .from('game_sessions')
      .select('user_id')
      .gte('created_at', day1);

    const { data: sessions7d } = await supabase
      .from('game_sessions')
      .select('user_id')
      .gte('created_at', day7);

    const { data: sessions30d } = await supabase
      .from('game_sessions')
      .select('user_id')
      .gte('created_at', day30);

    if (profiles) {
      const userRegionMap: Record<string, string> = {};
      profiles.forEach(p => {
        userRegionMap[p.user_id] = p.region || 'unknown';
      });

      const regionStats: Record<string, RegionalActivity> = {};

      profiles.forEach(p => {
        const region = p.region || 'unknown';
        if (!regionStats[region]) {
          regionStats[region] = {
            region,
            onlineNow: 0,
            played24h: 0,
            played7d: 0,
            played30d: 0,
            totalUsers: 0,
          };
        }
        regionStats[region].totalUsers++;
      });

      // Count online users by region
      onlineData?.forEach(o => {
        const region = userRegionMap[o.user_id] || 'unknown';
        if (regionStats[region] && o.status === 'online') {
          regionStats[region].onlineNow++;
        }
      });

      // Count unique players by region for each time period
      const countUniqueByRegion = (sessions: { user_id: string | null }[] | null) => {
        const byRegion: Record<string, Set<string>> = {};
        sessions?.forEach(s => {
          if (s.user_id) {
            const region = userRegionMap[s.user_id] || 'unknown';
            if (!byRegion[region]) byRegion[region] = new Set();
            byRegion[region].add(s.user_id);
          }
        });
        return byRegion;
      };

      const players24h = countUniqueByRegion(sessions24h);
      const players7d = countUniqueByRegion(sessions7d);
      const players30d = countUniqueByRegion(sessions30d);

      Object.keys(regionStats).forEach(region => {
        regionStats[region].played24h = players24h[region]?.size || 0;
        regionStats[region].played7d = players7d[region]?.size || 0;
        regionStats[region].played30d = players30d[region]?.size || 0;
      });

      setRegionalActivity(Object.values(regionStats).sort((a, b) => b.totalUsers - a.totalUsers));
    }
  };

  const fetchPurchases = async () => {
    const { data, count } = await supabase
      .from('vip_subscriptions')
      .select(`
        id,
        vip_tier,
        purchase_platform,
        created_at,
        user_id
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      // Get user profiles for these purchases
      const userIds = data.map(d => d.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nickname, region')
        .in('user_id', userIds);

      const profileMap: Record<string, { nickname: string; region: string }> = {};
      profilesData?.forEach(p => {
        profileMap[p.user_id] = { nickname: p.nickname, region: p.region || 'unknown' };
      });

      const purchasesWithNames = data.map(p => ({
        id: p.id,
        nickname: profileMap[p.user_id]?.nickname || 'Unknown',
        tier: p.vip_tier,
        platform: p.purchase_platform || 'unknown',
        created_at: p.created_at,
        region: profileMap[p.user_id]?.region || 'unknown',
      }));

      setPurchases(purchasesWithNames);
      setTotalPurchases(count || 0);

      // Count by tier - get all for accurate count
      const { data: allVip } = await supabase
        .from('vip_subscriptions')
        .select('vip_tier');

      const tierCounts: Record<string, number> = {};
      allVip?.forEach(p => {
        tierCounts[p.vip_tier] = (tierCounts[p.vip_tier] || 0) + 1;
      });
      setPurchasesByTier(tierCounts);
    }
  };

  const fetchTopCustomers = async () => {
    // Top paying (most VIP subscriptions)
    const { data: vipData } = await supabase
      .from('vip_subscriptions')
      .select('user_id, vip_tier');

    if (vipData) {
      const userVipCount: Record<string, number> = {};
      vipData.forEach(v => {
        const score = v.vip_tier === 'premium' ? 2 : 1;
        userVipCount[v.user_id] = (userVipCount[v.user_id] || 0) + score;
      });

      const topUserIds = Object.entries(userVipCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);

      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, region')
          .in('user_id', topUserIds);

        const topPaying = topUserIds.map(userId => {
          const profile = profiles?.find(p => p.user_id === userId);
          return {
            nickname: profile?.nickname || 'Unknown',
            region: profile?.region || 'unknown',
            value: userVipCount[userId],
          };
        });
        setTopPayingCustomers(topPaying);
      }
    }

    // Top ads watchers
    const { data: adsData } = await supabase
      .from('user_daily_plays')
      .select('user_id, plays_from_ads');

    if (adsData) {
      const userAdsCount: Record<string, number> = {};
      adsData.forEach(a => {
        userAdsCount[a.user_id] = (userAdsCount[a.user_id] || 0) + (a.plays_from_ads || 0);
      });

      const topAdUserIds = Object.entries(userAdsCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);

      if (topAdUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, region')
          .in('user_id', topAdUserIds);

        const topAds = topAdUserIds.map(userId => {
          const profile = profiles?.find(p => p.user_id === userId);
          return {
            nickname: profile?.nickname || 'Unknown',
            region: profile?.region || 'unknown',
            value: userAdsCount[userId],
          };
        });
        setTopAdsWatchers(topAds);
      }
    }
  };

  const fetchRegionalMetrics = async () => {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, region, games_played');

    // Get ads data
    const { data: adsData } = await supabase
      .from('user_daily_plays')
      .select('user_id, plays_from_ads');

    if (profiles) {
      const regionData: Record<string, { users: Set<string>; ads: number; games: number }> = {};

      profiles.forEach(p => {
        const region = p.region || 'unknown';
        if (!regionData[region]) {
          regionData[region] = { users: new Set(), ads: 0, games: 0 };
        }
        regionData[region].users.add(p.user_id);
        regionData[region].games += p.games_played || 0;
      });

      adsData?.forEach(a => {
        const profile = profiles.find(p => p.user_id === a.user_id);
        const region = profile?.region || 'unknown';
        if (regionData[region]) {
          regionData[region].ads += a.plays_from_ads || 0;
        }
      });

      const metrics = Object.entries(regionData).map(([region, data]) => ({
        region,
        totalUsers: data.users.size,
        avgAdsPerUser: data.users.size > 0 ? data.ads / data.users.size : 0,
        avgGamesPerUser: data.users.size > 0 ? data.games / data.users.size : 0,
      }));

      setRegionalMetrics(metrics.sort((a, b) => b.totalUsers - a.totalUsers));
    }
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      ka: '🇬🇪',
      en: '🇺🇸',
      ru: '🇷🇺',
      de: '🇩🇪',
      fr: '🇫🇷',
    };
    return flags[lang] || '🌍';
  };

  const getRegionFlag = (region: string) => {
    const flags: Record<string, string> = {
      ge: '🇬🇪',
      us: '🇺🇸',
      ru: '🇷🇺',
      de: '🇩🇪',
      uk: '🇬🇧',
    };
    return flags[region] || '🌍';
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Language Buckets */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">Language Buckets</h3>
              </div>
              <div className="space-y-3">
                {languageBuckets.map((bucket) => (
                  <div key={bucket.language} className="text-xs font-mono">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getLanguageFlag(bucket.language)}</span>
                      <span className="uppercase font-bold text-primary">[{bucket.language}]</span>
                    </div>
                    <div className="pl-6 space-y-0.5 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground/50">├─</span>
                        <span>In Prod:</span>
                        <span className="text-emerald-500 font-bold">{bucket.inProd.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground/50">├─</span>
                        <span>In Lib:</span>
                        <span className="text-amber-500 font-bold">{bucket.inLib.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground/50">└─</span>
                        <span>Total:</span>
                        <span className="font-bold">{bucket.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Regional Activity */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Regional Activity</h3>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {regionalActivity.map((region) => (
                    <div key={region.region} className="text-xs font-mono">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getRegionFlag(region.region)}</span>
                        <span className="uppercase font-bold text-emerald-500">{region.region}</span>
                        {region.onlineNow > 0 && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {region.onlineNow}
                          </span>
                        )}
                      </div>
                      <div className="pl-6 space-y-0.5 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/50">├─</span>
                          <span>Online:</span>
                          <span className="text-emerald-500 font-bold">{region.onlineNow}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/50">├─</span>
                          <span>24h:</span>
                          <span className="text-cyan-500 font-bold">{region.played24h}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/50">├─</span>
                          <span>7d:</span>
                          <span className="text-blue-500 font-bold">{region.played7d}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/50">└─</span>
                          <span>Users:</span>
                          <span className="font-bold">{region.totalUsers}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Shop Analytics */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Shop Analytics</h3>
              </div>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Purchases:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {totalPurchases}
                  </Badge>
                </div>
                
                <div className="border-t pt-2">
                  <div className="text-muted-foreground mb-1">By Tier:</div>
                  {Object.entries(purchasesByTier).map(([tier, count]) => (
                    <div key={tier} className="flex items-center gap-1 pl-2 text-muted-foreground">
                      <span className="text-muted-foreground/50">├─</span>
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span>{tier}:</span>
                      <span className="text-amber-500 font-bold">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2">
                  <div className="text-muted-foreground mb-1">Recent:</div>
                  <ScrollArea className="h-[80px]">
                    {purchases.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-muted-foreground py-0.5">
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-primary truncate max-w-[80px]">{p.nickname}</span>
                        <span>-</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {p.tier}
                        </Badge>
                        <span className="text-muted-foreground/70 text-[10px]">{formatTimeAgo(p.created_at)}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Top Customers */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Top Customers</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-muted-foreground mb-2 flex items-center gap-1">
                    <span className="text-amber-500">💰</span> Highest Paying
                  </div>
                  {topPayingCustomers.length === 0 ? (
                    <div className="text-muted-foreground/50">No data</div>
                  ) : (
                    topPayingCustomers.map((c, i) => (
                      <div key={i} className="flex items-center gap-1 text-muted-foreground py-0.5">
                        <span className="text-muted-foreground/50">{i + 1}.</span>
                        <span className="text-primary">{c.nickname}</span>
                        <span className="text-muted-foreground/50">({c.region})</span>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground mb-2 flex items-center gap-1">
                    <Eye className="h-3 w-3 text-violet-500" /> Most Ads
                  </div>
                  {topAdsWatchers.length === 0 ? (
                    <div className="text-muted-foreground/50">No data</div>
                  ) : (
                    topAdsWatchers.map((c, i) => (
                      <div key={i} className="flex items-center gap-1 text-muted-foreground py-0.5">
                        <span className="text-muted-foreground/50">{i + 1}.</span>
                        <span className="text-primary">{c.nickname}</span>
                        <span className="text-violet-500">({c.value})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Metrics */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-semibold">Averages Per User By Region</h3>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {regionalMetrics.slice(0, 5).map((m) => (
                  <div key={m.region} className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{getRegionFlag(m.region)}</span>
                      <span className="uppercase">{m.region}</span>
                      <span className="text-muted-foreground/50">({m.totalUsers} users)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-violet-500" />
                        <span className="text-violet-500">{m.avgAdsPerUser.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-500">{m.avgGamesPerUser.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t flex items-center gap-4 text-muted-foreground/50">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Ads/User
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Games/User
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time/User (coming)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
