import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

// Widget icons from the 9k library
const WIDGET_ICONS = {
  languages: `${ICON_STORAGE_URL}/notebook.png`,
  regional: `${ICON_STORAGE_URL}/globe.png?t=1767636043880`,
  shop: `${ICON_STORAGE_URL}/shopping-cart.png`,
  customers: `${ICON_STORAGE_URL}/coins.png?t=1767639090278`,
  metrics: `${ICON_STORAGE_URL}/bar-chart.png`,
  analytics: `${ICON_STORAGE_URL}/charts.png`,
};

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
  avatar_url: string | null;
}

interface TopCustomer {
  nickname: string;
  region: string;
  value: number | string;
  avatar_url: string | null;
}

interface RegionalMetrics {
  region: string;
  avgAdsPerUser: number;
  avgGamesPerUser: number;
  totalUsers: number;
}

// Widget Card Component with 3D chunky style
function WidgetCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      className={`bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-border/30 ${className}`}
      style={{ fontFamily: "'Google Sans', sans-serif" }}
    >
      {children}
    </div>
  );
}

// Widget Header with icon
function WidgetHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <img src={icon} alt="" className="w-7 h-7 object-contain" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
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
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, region');

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: onlineData } = await supabase
      .from('user_presence')
      .select('user_id, status, last_seen')
      .eq('status', 'online')
      .gte('last_seen', twoMinutesAgo);

    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions24h } = await supabase
      .from('game_sessions')
      .select('user_id')
      .gte('created_at', day1);

    const { data: sessions7d } = await supabase
      .from('game_sessions')
      .select('user_id')
      .gte('created_at', day7);

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

      onlineData?.forEach(o => {
        const region = userRegionMap[o.user_id] || 'unknown';
        if (regionStats[region] && o.status === 'online') {
          regionStats[region].onlineNow++;
        }
      });

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

      Object.keys(regionStats).forEach(region => {
        regionStats[region].played24h = players24h[region]?.size || 0;
        regionStats[region].played7d = players7d[region]?.size || 0;
      });

      setRegionalActivity(Object.values(regionStats).sort((a, b) => b.totalUsers - a.totalUsers));
    }
  };

  const fetchPurchases = async () => {
    const { data, count } = await supabase
      .from('vip_subscriptions')
      .select('id, vip_tier, purchase_platform, created_at, user_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const userIds = data.map(d => d.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nickname, region, avatar_url')
        .in('user_id', userIds);

      const profileMap: Record<string, { nickname: string; region: string; avatar_url: string | null }> = {};
      profilesData?.forEach(p => {
        profileMap[p.user_id] = { nickname: p.nickname, region: p.region || 'unknown', avatar_url: p.avatar_url };
      });

      const purchasesWithNames = data.map(p => ({
        id: p.id,
        nickname: profileMap[p.user_id]?.nickname || 'Unknown',
        tier: p.vip_tier,
        platform: p.purchase_platform || 'unknown',
        created_at: p.created_at,
        region: profileMap[p.user_id]?.region || 'unknown',
        avatar_url: profileMap[p.user_id]?.avatar_url || null,
      }));

      setPurchases(purchasesWithNames);
      setTotalPurchases(count || 0);

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
          .select('user_id, nickname, region, avatar_url')
          .in('user_id', topUserIds);

        const topPaying = topUserIds.map(userId => {
          const profile = profiles?.find(p => p.user_id === userId);
          return {
            nickname: profile?.nickname || 'Unknown',
            region: profile?.region || 'unknown',
            value: userVipCount[userId],
            avatar_url: profile?.avatar_url || null,
          };
        });
        setTopPayingCustomers(topPaying);
      }
    }

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
          .select('user_id, nickname, region, avatar_url')
          .in('user_id', topAdUserIds);

        const topAds = topAdUserIds.map(userId => {
          const profile = profiles?.find(p => p.user_id === userId);
          return {
            nickname: profile?.nickname || 'Unknown',
            region: profile?.region || 'unknown',
            value: userAdsCount[userId],
            avatar_url: profile?.avatar_url || null,
          };
        });
        setTopAdsWatchers(topAds);
      }
    }
  };

  const fetchRegionalMetrics = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, region, games_played');

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

    if (diffMins < 60) return `${diffMins} წთ წინ`;
    if (diffHours < 24) return `${diffHours} სთ წინ`;
    return `${diffDays} დღის წინ`;
  };

  if (loading) {
    return (
      <WidgetCard>
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-muted-foreground text-sm">იტვირთება...</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'Google Sans', sans-serif" }}>
      {/* Top Row - 3 widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Language Buckets */}
        <WidgetCard>
          <WidgetHeader icon={WIDGET_ICONS.languages} title="ენების მიხედვით" />
          <div className="space-y-4">
            {languageBuckets.map((bucket) => (
              <div key={bucket.language} className="text-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{getLanguageFlag(bucket.language)}</span>
                  <span className="uppercase font-bold text-primary">[{bucket.language}]</span>
                </div>
                <div className="pl-8 space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">├─</span>
                    <span>პროდში:</span>
                    <span className="text-emerald-500 font-semibold">{bucket.inProd.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">├─</span>
                    <span>ბიბლში:</span>
                    <span className="text-amber-500 font-semibold">{bucket.inLib.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">└─</span>
                    <span>სულ:</span>
                    <span className="font-bold text-foreground">{bucket.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Regional Activity */}
        <WidgetCard>
          <WidgetHeader icon={WIDGET_ICONS.regional} title="რეგიონული აქტივობა" />
          <ScrollArea className="h-[220px]">
            <div className="space-y-4">
              {regionalActivity.map((region) => (
                <div key={region.region} className="text-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{getRegionFlag(region.region)}</span>
                    <span className="uppercase font-bold text-emerald-500">{region.region}</span>
                    {region.onlineNow > 0 && (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {region.onlineNow}
                      </span>
                    )}
                  </div>
                  <div className="pl-8 space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/40">├─</span>
                      <span>ონლაინ:</span>
                      <span className="text-emerald-500 font-semibold">{region.onlineNow}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/40">├─</span>
                      <span>24სთ:</span>
                      <span className="text-cyan-500 font-semibold">{region.played24h}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/40">├─</span>
                      <span>7დღე:</span>
                      <span className="text-blue-500 font-semibold">{region.played7d}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/40">└─</span>
                      <span>მომხმ:</span>
                      <span className="font-bold text-foreground">{region.totalUsers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </WidgetCard>

        {/* Shop Analytics */}
        <WidgetCard>
          <WidgetHeader icon={WIDGET_ICONS.shop} title="მაღაზია" />
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">სულ შენაძენები:</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold px-3">
                {totalPurchases}
              </Badge>
            </div>
            
            <div className="border-t pt-3">
              <div className="text-muted-foreground mb-2">ტიერის მიხედვით:</div>
              {Object.entries(purchasesByTier).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2 pl-3 text-muted-foreground py-0.5">
                  <span className="text-muted-foreground/40">├─</span>
                  <span>👑</span>
                  <span>{tier}:</span>
                  <span className="text-amber-500 font-semibold">{count}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="text-muted-foreground mb-2">ბოლო:</div>
              <ScrollArea className="h-[90px]">
                {purchases.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-muted-foreground py-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {p.nickname[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-primary font-medium truncate max-w-[70px]">{p.nickname}</span>
                    <span className="text-muted-foreground/50">–</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      {p.tier}
                    </Badge>
                    <span className="text-muted-foreground/60 text-xs">{formatTimeAgo(p.created_at)}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* Bottom Row - 2 widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Customers */}
        <WidgetCard>
          <WidgetHeader icon={WIDGET_ICONS.customers} title="ტოპ მომხმარებლები" />
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground mb-3 flex items-center gap-2 font-medium">
                <span>💰</span> მაღალი გადამხდელი
              </div>
              {topPayingCustomers.length === 0 ? (
                <div className="text-muted-foreground/50 text-sm">მონაცემები არ არის</div>
              ) : (
                <div className="space-y-2">
                  {topPayingCustomers.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-muted-foreground/50 w-4">{i + 1}.</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {c.nickname[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-primary font-medium">{c.nickname}</span>
                      <span className="text-muted-foreground/50">({c.region})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground mb-3 flex items-center gap-2 font-medium">
                <span>📺</span> რეკლამები
              </div>
              {topAdsWatchers.length === 0 ? (
                <div className="text-muted-foreground/50 text-sm">მონაცემები არ არის</div>
              ) : (
                <div className="space-y-2">
                  {topAdsWatchers.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-muted-foreground/50 w-4">{i + 1}.</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {c.nickname[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-primary font-medium">{c.nickname}</span>
                      <span className="text-violet-500">({c.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </WidgetCard>

        {/* Average Metrics */}
        <WidgetCard>
          <WidgetHeader icon={WIDGET_ICONS.metrics} title="საშუალო მეტრიკები რეგიონით" />
          <div className="space-y-3 text-sm">
            {regionalMetrics.slice(0, 5).map((m) => (
              <div key={m.region} className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getRegionFlag(m.region)}</span>
                  <span className="uppercase font-medium text-foreground">{m.region}</span>
                  <span className="text-muted-foreground/50">({m.totalUsers} მომხმ.)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span>📺</span>
                    <span className="text-violet-500 font-semibold">{m.avgAdsPerUser.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🎮</span>
                    <span className="text-emerald-500 font-semibold">{m.avgGamesPerUser.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t flex items-center gap-5 text-muted-foreground/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span>📺</span> რეკლ/მომხ
              </div>
              <div className="flex items-center gap-1.5">
                <span>🎮</span> თამაშ/მომხ
              </div>
              <div className="flex items-center gap-1.5">
                <span>⏱️</span> დრო/მომხ (მალე)
              </div>
            </div>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
