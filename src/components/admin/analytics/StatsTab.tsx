import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Monitor, Smartphone, Tablet, Clock, 
  Globe, TrendingUp, AlertTriangle, BarChart3, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { fetchAdminUserIds, isExcludedUser } from '@/lib/excludedUsers';

interface SessionData {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  screen_width: number | null;
  screen_height: number | null;
  entry_page: string | null;
  exit_page: string | null;
  pages_visited: number | null;
  country_code: string | null;
  is_bounce: boolean | null;
}

interface PresenceData {
  user_id: string;
  status: string;
  last_seen: string;
  current_page: string | null;
}

export function StatsTab() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [presenceData, setPresenceData] = useState<PresenceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminIds, sessionsResult, presenceResult] = await Promise.all([
        fetchAdminUserIds(),
        supabase
          .from('user_sessions')
          .select('*')
          .order('session_start', { ascending: false })
          .limit(1000),
        supabase
          .from('user_presence')
          .select('user_id, status, last_seen, current_page')
      ]);

      const filteredSessions = (sessionsResult.data || []).filter(
        s => !isExcludedUser(s.user_id, adminIds)
      ) as SessionData[];
      const filteredPresence = (presenceResult.data || []).filter(
        p => !isExcludedUser(p.user_id, adminIds)
      );

      setSessions(filteredSessions);
      setPresenceData(filteredPresence);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // ======= REAL-TIME PRESENCE METRICS =======
  const presenceMetrics = useMemo(() => {
    const now = Date.now();
    const oneMin = now - 60 * 1000;
    const oneHour = now - 60 * 60 * 1000;
    const threeHours = now - 3 * 60 * 60 * 1000;
    const sixHours = now - 6 * 60 * 60 * 1000;
    const oneDay = now - 24 * 60 * 60 * 1000;

    const online = presenceData.filter(p => 
      p.status === 'online' && new Date(p.last_seen).getTime() >= oneMin
    ).length;
    
    const lastHour = presenceData.filter(p => new Date(p.last_seen).getTime() >= oneHour).length;
    const last3h = presenceData.filter(p => new Date(p.last_seen).getTime() >= threeHours).length;
    const last6h = presenceData.filter(p => new Date(p.last_seen).getTime() >= sixHours).length;
    const last24h = presenceData.filter(p => new Date(p.last_seen).getTime() >= oneDay).length;

    return { online, lastHour, last3h, last6h, last24h };
  }, [presenceData]);

  // ======= DEVICE / BROWSER / OS METRICS =======
  const deviceMetrics = useMemo(() => {
    const browsers: Record<string, number> = {};
    const operatingSystems: Record<string, number> = {};
    const deviceTypes: Record<string, number> = {};
    const resolutions: Record<string, number> = {};

    sessions.forEach(s => {
      if (s.browser) browsers[s.browser] = (browsers[s.browser] || 0) + 1;
      if (s.os) operatingSystems[s.os] = (operatingSystems[s.os] || 0) + 1;
      if (s.device_type) deviceTypes[s.device_type] = (deviceTypes[s.device_type] || 0) + 1;
      if (s.screen_width && s.screen_height) {
        const res = `${s.screen_width}×${s.screen_height}`;
        resolutions[res] = (resolutions[res] || 0) + 1;
      }
    });

    const toSorted = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]);

    return {
      browsers: toSorted(browsers),
      operatingSystems: toSorted(operatingSystems),
      deviceTypes: toSorted(deviceTypes),
      resolutions: toSorted(resolutions).slice(0, 5),
    };
  }, [sessions]);

  // ======= SESSION DURATION METRICS =======
  const sessionMetrics = useMemo(() => {
    const completedSessions = sessions.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
    
    if (completedSessions.length === 0) {
      return { avgDuration: 0, medianDuration: 0, avgPages: 0, topPages: [], totalSessions: sessions.length };
    }

    const durations = completedSessions.map(s => s.duration_seconds!).sort((a, b) => a - b);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const medianDuration = durations[Math.floor(durations.length / 2)];

    const pagesArr = completedSessions.map(s => s.pages_visited || 1);
    const avgPages = Math.round((pagesArr.reduce((a, b) => a + b, 0) / pagesArr.length) * 10) / 10;

    // Top pages by visit count
    const pageCounts: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.entry_page) pageCounts[s.entry_page] = (pageCounts[s.entry_page] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { avgDuration, medianDuration, avgPages, topPages, totalSessions: sessions.length };
  }, [sessions]);

  // ======= BOUNCE RATE METRICS =======
  const bounceMetrics = useMemo(() => {
    const totalSessions = sessions.length;
    const bounceSessions = sessions.filter(s => s.is_bounce === true);
    const bounceRate = totalSessions > 0 ? Math.round((bounceSessions.length / totalSessions) * 100) : 0;

    // Today vs yesterday bounce rates
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const todaySessions = sessions.filter(s => new Date(s.session_start).getTime() >= todayStart);
    const yesterdaySessions = sessions.filter(s => {
      const t = new Date(s.session_start).getTime();
      return t >= yesterdayStart && t < todayStart;
    });

    const todayBounceRate = todaySessions.length > 0
      ? Math.round((todaySessions.filter(s => s.is_bounce).length / todaySessions.length) * 100) : 0;
    const yesterdayBounceRate = yesterdaySessions.length > 0
      ? Math.round((yesterdaySessions.filter(s => s.is_bounce).length / yesterdaySessions.length) * 100) : 0;

    const recentBounces = bounceSessions.slice(0, 10);

    return { total: bounceSessions.length, bounceRate, todayBounceRate, yesterdayBounceRate, recentBounces };
  }, [sessions]);

  // ======= BETA ENGAGEMENT METRICS =======
  const engagementMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

    // Unique users by time period
    const uniqueUsersToday = new Set(sessions.filter(s => new Date(s.session_start).getTime() >= todayStart).map(s => s.user_id)).size;
    const uniqueUsersWeek = new Set(sessions.filter(s => new Date(s.session_start).getTime() >= weekStart).map(s => s.user_id)).size;
    const uniqueUsersMonth = new Set(sessions.filter(s => new Date(s.session_start).getTime() >= monthStart).map(s => s.user_id)).size;

    // Returning users: users with more than 1 session
    const userSessionCounts: Record<string, number> = {};
    sessions.forEach(s => {
      userSessionCounts[s.user_id] = (userSessionCounts[s.user_id] || 0) + 1;
    });
    const totalUniqueUsers = Object.keys(userSessionCounts).length;
    const returningUsers = Object.values(userSessionCounts).filter(c => c > 1).length;
    const returningRate = totalUniqueUsers > 0 ? Math.round((returningUsers / totalUniqueUsers) * 100) : 0;

    // Peak hours (0-23)
    const hourCounts: number[] = new Array(24).fill(0);
    sessions.forEach(s => {
      const hour = new Date(s.session_start).getHours();
      hourCounts[hour]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Country distribution
    const countryCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const cc = s.country_code || 'Unknown';
      countryCounts[cc] = (countryCounts[cc] || 0) + 1;
    });
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Feature adoption (page popularity from entry_page)
    const featurePages: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.entry_page) featurePages[s.entry_page] = (featurePages[s.entry_page] || 0) + 1;
    });
    const topFeatures = Object.entries(featurePages).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      uniqueUsersToday, uniqueUsersWeek, uniqueUsersMonth,
      returningRate, returningUsers, totalUniqueUsers,
      peakHour, hourCounts,
      topCountries, topFeatures,
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section A: Real-time Active Users */}
      <div>
        <SectionHeader icon={<Activity className="h-4 w-4" />} title="Real-time Presence" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <PresenceCard label="Online Now" value={presenceMetrics.online} color="emerald" />
          <PresenceCard label="Last 1 Hour" value={presenceMetrics.lastHour} color="blue" />
          <PresenceCard label="Last 3 Hours" value={presenceMetrics.last3h} color="violet" />
          <PresenceCard label="Last 6 Hours" value={presenceMetrics.last6h} color="amber" />
          <PresenceCard label="Last 24 Hours" value={presenceMetrics.last24h} color="slate" />
        </div>
      </div>

      {/* Section B: Device & Browser Breakdown */}
      <div>
        <SectionHeader icon={<Monitor className="h-4 w-4" />} title="Device & Browser" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DistributionCard title="Browsers" items={deviceMetrics.browsers} total={sessions.length} />
          <DistributionCard title="Operating Systems" items={deviceMetrics.operatingSystems} total={sessions.length} />
          <DistributionCard title="Device Types" items={deviceMetrics.deviceTypes} total={sessions.length} icon={getDeviceIcon} />
          <DistributionCard title="Top Resolutions" items={deviceMetrics.resolutions} total={sessions.length} />
        </div>
      </div>

      {/* Section C: Session Duration */}
      <div>
        <SectionHeader icon={<Clock className="h-4 w-4" />} title="Session Duration" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Avg Duration" value={formatDuration(sessionMetrics.avgDuration)} />
          <MetricCard label="Median Duration" value={formatDuration(sessionMetrics.medianDuration)} />
          <MetricCard label="Avg Pages/Session" value={sessionMetrics.avgPages.toString()} />
          <MetricCard label="Total Sessions" value={sessionMetrics.totalSessions.toLocaleString()} />
        </div>
        {sessionMetrics.topPages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Most Visited Pages</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {sessionMetrics.topPages.map(([page, count], i) => (
                  <div key={page} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-sm font-mono flex-1 truncate">{page}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section D: Bounce Rate */}
      <div>
        <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} title="Bounce Rate (< 10s)" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Bounce Rate" value={`${bounceMetrics.bounceRate}%`} variant={bounceMetrics.bounceRate > 50 ? 'danger' : 'default'} />
          <MetricCard label="Total Bounces" value={bounceMetrics.total.toLocaleString()} />
          <MetricCard label="Today's Rate" value={`${bounceMetrics.todayBounceRate}%`} />
          <MetricCard 
            label="vs Yesterday" 
            value={`${bounceMetrics.todayBounceRate - bounceMetrics.yesterdayBounceRate > 0 ? '+' : ''}${bounceMetrics.todayBounceRate - bounceMetrics.yesterdayBounceRate}%`}
            variant={bounceMetrics.todayBounceRate > bounceMetrics.yesterdayBounceRate ? 'danger' : 'success'}
          />
        </div>
        {bounceMetrics.recentBounces.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Bounces</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {bounceMetrics.recentBounces.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="font-mono truncate flex-1">{s.entry_page || '/'}</span>
                    <Badge variant="outline" className="text-xs">{s.device_type || '?'}</Badge>
                    <span className="text-xs text-muted-foreground">{s.country_code || '??'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.session_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section E: Beta Engagement */}
      <div>
        <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="Beta Engagement" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Users Today" value={engagementMetrics.uniqueUsersToday.toString()} />
          <MetricCard label="Users This Week" value={engagementMetrics.uniqueUsersWeek.toString()} />
          <MetricCard label="Users This Month" value={engagementMetrics.uniqueUsersMonth.toString()} />
          <MetricCard label="Returning Rate" value={`${engagementMetrics.returningRate}%`} variant="success" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Peak Hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Peak Usage Hours</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end gap-0.5 h-24">
                {engagementMetrics.hourCounts.map((count, hour) => {
                  const max = Math.max(...engagementMetrics.hourCounts, 1);
                  const height = (count / max) * 100;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={cn(
                          "w-full rounded-t transition-all",
                          hour === engagementMetrics.peakHour ? "bg-primary" : "bg-primary/30"
                        )}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${hour}:00 — ${count} sessions`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">0:00</span>
                <span className="text-[10px] text-muted-foreground">12:00</span>
                <span className="text-[10px] text-muted-foreground">23:00</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Peak hour: <span className="font-medium text-foreground">{engagementMetrics.peakHour}:00</span>
              </p>
            </CardContent>
          </Card>

          {/* Top Countries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Country Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {engagementMetrics.topCountries.map(([cc, count]) => {
                  const pct = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0;
                  return (
                    <div key={cc} className="flex items-center gap-3">
                      <span className="text-lg">{getFlagEmoji(cc)}</span>
                      <span className="text-sm font-medium uppercase flex-1">{cc}</span>
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Adoption */}
        {engagementMetrics.topFeatures.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Feature Adoption (Entry Pages)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {engagementMetrics.topFeatures.map(([page, count]) => {
                  const pct = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0;
                  return (
                    <div key={page} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-mono truncate text-muted-foreground">{page}</p>
                      <p className="text-lg font-bold mt-1">{count}</p>
                      <p className="text-xs text-muted-foreground">{pct}% of sessions</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ======= SUB-COMPONENTS =======

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 bg-primary/10 rounded-lg">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function PresenceCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    slate: 'bg-muted text-muted-foreground',
  };
  const dotColor: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    slate: 'bg-muted-foreground',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", dotColor[color])} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'danger' | 'default' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={cn(
          "text-xl font-bold",
          variant === 'success' && "text-emerald-500",
          variant === 'danger' && "text-destructive",
        )}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DistributionCard({ 
  title, items, total, icon 
}: { 
  title: string; 
  items: [string, number][]; 
  total: number;
  icon?: (name: string) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {items.slice(0, 5).map(([name, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {icon && icon(name)}
                    <span>{name}</span>
                  </div>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ======= HELPERS =======

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getDeviceIcon(name: string): React.ReactNode {
  switch (name.toLowerCase()) {
    case 'mobile': return <Smartphone className="h-3 w-3" />;
    case 'tablet': return <Tablet className="h-3 w-3" />;
    case 'desktop': return <Monitor className="h-3 w-3" />;
    default: return null;
  }
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === 'Unknown' || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
