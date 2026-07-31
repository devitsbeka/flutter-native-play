import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Users, Search, Globe, Crown, Clock, Gamepad2,
  Coins, Gem, ArrowUpDown, Filter, ChevronDown, BarChart3,
  RefreshCw, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { fetchAdminUserIds, isExcludedUser } from '@/lib/excludedUsers';

/** One row of admin_user_economy() - the has_role-gated replacement for
 *  selecting coins/gems straight off profiles. */
interface AdminEconomyRow {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  country_code: string | null;
  games_played: number | null;
  games_won: number | null;
  total_points: number | null;
  coins: number | null;
  gems: number | null;
  has_referral_code: boolean;
  created_at: string | null;
}
import { UserAnalyticsTable } from '@/components/admin/analytics/UserAnalyticsTable';
import { CountryBreakdownChart } from '@/components/admin/analytics/CountryBreakdownChart';
import { ActivityTimeline } from '@/components/admin/analytics/ActivityTimeline';
import { StatsTab } from '@/components/admin/analytics/StatsTab';
import { InsightsTab } from '@/components/admin/analytics/InsightsTab';
import { UserDetailModal } from '@/components/admin/analytics/UserDetailModal';
import { callRpc } from '@/integrations/supabase/rpc';

export interface AnalyticsUser {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  status: 'online' | 'away' | 'offline';
  current_page: string | null;
  last_seen: string | null;
  games_played: number;
  games_won: number;
  created_at: string;
  coins: number;
  gems: number;
  isVip: boolean;
  isGuest: boolean;
}

type StatusFilter = 'all' | 'online' | 'away' | 'offline';
type SortField = 'last_seen' | 'games_played' | 'coins' | 'created_at';

export default function UserAnalytics() {
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [vipFilter, setVipFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_seen');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AnalyticsUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatedAgoText, setUpdatedAgoText] = useState('0s ago');
  const lastUpdatedRef = useRef<Date>(new Date());

  const fetchAllUsers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      // gems is no longer selectable by the `authenticated` role (it leaked
      // every player's balance to anyone with the anon key), so the admin
      // dashboards read it through an explicitly has_role-gated function.
      const [adminIds, { data: economy, error: profilesError }] = await Promise.all([
        fetchAdminUserIds(),
        callRpc<AdminEconomyRow[]>('admin_user_economy'),
      ]);

      if (profilesError) throw profilesError;

      const profiles = (economy ?? [])
        .slice()
        .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, status, current_page, last_seen, country_code')
        .gte('last_seen', dayAgo);

      const { data: vipData } = await supabase
        .from('vip_subscriptions')
        .select('user_id')
        .gte('expires_at', new Date().toISOString());

      const presenceMap = new Map((presenceData || []).map(p => [p.user_id, p]));
      const vipSet = new Set((vipData || []).map(v => v.user_id));
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const realProfiles = (profiles || []).filter(p => !isExcludedUser(p.user_id, adminIds));

      const mapped: AnalyticsUser[] = realProfiles.map(profile => {
        const presence = presenceMap.get(profile.user_id);
        let status: 'online' | 'away' | 'offline' = 'offline';
        if (presence) {
          if (presence.status === 'online' && presence.last_seen >= twoMinutesAgo) {
            status = 'online';
          } else if (presence.last_seen >= new Date(Date.now() - 10 * 60 * 1000).toISOString()) {
            status = 'away';
          }
        }
        return {
          user_id: profile.user_id,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          country_code: presence?.country_code || profile.country_code,
          status,
          current_page: presence?.current_page || null,
          last_seen: presence?.last_seen || null,
          games_played: profile.games_played || 0,
          games_won: profile.games_won || 0,
          created_at: profile.created_at,
          coins: profile.coins || 0,
          gems: profile.gems || 0,
          isVip: vipSet.has(profile.user_id),
          isGuest: false,
        };
      });

      setUsers(mapped);
      const now = new Date();
      setLastUpdated(now);
      lastUpdatedRef.current = now;
    } catch (err) {
      console.error('Error fetching analytics users:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchAllUsers();
    const interval = setInterval(() => fetchAllUsers(), 30000);
    return () => clearInterval(interval);
  }, [fetchAllUsers]);

  // Realtime subscription for instant new signup detection
  useEffect(() => {
    const channel = supabase
      .channel('analytics-profiles-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        fetchAllUsers(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllUsers]);

  // Live "Updated Xs ago" counter
  useEffect(() => {
    const tick = setInterval(() => {
      const secs = Math.round((Date.now() - lastUpdatedRef.current.getTime()) / 1000);
      setUpdatedAgoText(secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const online = users.filter(u => u.status === 'online').length;
    const away = users.filter(u => u.status === 'away').length;
    const offline = users.filter(u => u.status === 'offline').length;
    const vip = users.filter(u => u.isVip).length;
    return { total: users.length, online, away, offline, vip };
  }, [users]);

  // Filtered & sorted users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.nickname.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter);
    }
    if (countryFilter) {
      result = result.filter(u => u.country_code === countryFilter);
    }
    if (vipFilter === 'vip') {
      result = result.filter(u => u.isVip);
    } else if (vipFilter === 'free') {
      result = result.filter(u => !u.isVip);
    }

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'last_seen':
          valA = a.last_seen || '';
          valB = b.last_seen || '';
          break;
        case 'games_played':
          valA = a.games_played;
          valB = b.games_played;
          break;
        case 'coins':
          valA = a.coins;
          valB = b.coins;
          break;
        case 'created_at':
          valA = a.created_at;
          valB = b.created_at;
          break;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, statusFilter, countryFilter, vipFilter, sortField, sortAsc]);

  // Country breakdown
  const countryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach(u => {
      const cc = u.country_code || 'Unknown';
      map.set(cc, (map.get(cc) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const handleCountryClick = (country: string) => {
    setCountryFilter(prev => prev === country ? null : country);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-6rem)]">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">User Analytics</h1>
              <p className="text-sm text-muted-foreground">მომხმარებლების სრული ანალიტიკა</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Updated {updatedAgoText}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllUsers(true)}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6 mt-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatsCard label="სულ მომხმარებლები" value={stats.total} icon={<Users className="h-4 w-4" />} />
              <StatsCard label="ონლაინ" value={stats.online} icon={<div className="h-3 w-3 rounded-full bg-emerald-500" />} variant="success" />
              <StatsCard label="Away" value={stats.away} icon={<div className="h-3 w-3 rounded-full bg-amber-500" />} variant="warning" />
              <StatsCard label="ოფლაინ" value={stats.offline} icon={<div className="h-3 w-3 rounded-full bg-muted-foreground" />} />
              <StatsCard label="VIP" value={stats.vip} icon={<Crown className="h-4 w-4 text-amber-500" />} variant="vip" />
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ძებნა სახელით..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="სტატუსი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა</SelectItem>
                      <SelectItem value="online">ონლაინ</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="offline">ოფლაინ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={vipFilter} onValueChange={setVipFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="VIP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                    </SelectContent>
                  </Select>
                  {countryFilter && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setCountryFilter(null)}
                    >
                      🌍 {countryFilter} ✕
                    </Badge>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {filteredUsers.length} მომხმარებელი
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Table */}
            <UserAnalyticsTable
              users={filteredUsers}
              loading={loading}
              sortField={sortField}
              sortAsc={sortAsc}
              onToggleSort={toggleSort}
              onUserClick={setSelectedUser}
            />

            {/* Bottom Row: Country Breakdown + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CountryBreakdownChart
                data={countryBreakdown}
                activeCountry={countryFilter}
                onCountryClick={handleCountryClick}
              />
              <ActivityTimeline />
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <StatsTab />
          </TabsContent>

          <TabsContent value="insights" className="mt-4">
            <InsightsTab users={users} />
          </TabsContent>
        </Tabs>

        {/* User Detail Modal */}
        <UserDetailModal
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      </div>
    </ScrollArea>
  );
}

function StatsCard({ 
  label, value, icon, variant 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode;
  variant?: 'success' | 'warning' | 'vip';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            variant === 'success' && "bg-emerald-500/10",
            variant === 'warning' && "bg-amber-500/10",
            variant === 'vip' && "bg-amber-500/10",
            !variant && "bg-muted"
          )}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}