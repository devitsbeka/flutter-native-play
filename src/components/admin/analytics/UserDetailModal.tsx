import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ka } from 'date-fns/locale';
import {
  Crown, Coins, Gem, Gamepad2, Clock, Calendar, Trophy,
  Target, TrendingUp, Monitor, Smartphone, Globe, ArrowLeft,
  Star, Flame, BarChart3, Activity, Eye, Play
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsUser } from '@/pages/admin/UserAnalytics';

interface Props {
  user: AnalyticsUser | null;
  open: boolean;
  onClose: () => void;
}

// ── Tiny stat card ──────────────────────────────────────────────
function MiniStat({ icon, label, value, className }: {
  icon: React.ReactNode; label: string; value: string | number; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-xl bg-secondary", className)}>
      <div className="mb-1 text-muted-foreground">{icon}</div>
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">{label}</span>
    </div>
  );
}

// ── Spinner ─────────────────────────────────────────────────────
function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// ── Country flag helper ─────────────────────────────────────────
const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
};

// Format seconds to human-readable
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function UserDetailModal({ user, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [gameSessions, setGameSessions] = useState<any[]>([]);
  const [gamePlays, setGamePlays] = useState<any[]>([]);
  const [roomHistory, setRoomHistory] = useState<any[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [dailyPlays, setDailyPlays] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!user || !open) return;
    setActiveTab('overview');
    fetchAllData(user.user_id);
  }, [user, open]);

  const fetchAllData = async (userId: string) => {
    setLoading(true);
    try {
      const [sessionsRes, playsRes, roomRes, userSessRes, dailyRes, catRes, profileRes] = await Promise.all([
        supabase.from('game_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('game_plays').select('*').eq('user_id', userId).order('played_at', { ascending: false }).limit(100),
        supabase.from('room_match_history').select('*').order('played_at', { ascending: false }).limit(200),
        supabase.from('user_sessions').select('*').eq('user_id', userId).order('session_start', { ascending: false }).limit(50),
        supabase.from('user_daily_plays').select('*').eq('user_id', userId).order('play_date', { ascending: false }).limit(30),
        supabase.from('categories').select('id, name, icon, color, category_id'),
        supabase.from('profiles').select('current_streak, best_streak').eq('user_id', userId).single(),
      ]);

      setGameSessions(sessionsRes.data || []);
      setGamePlays(playsRes.data || []);
      // Filter room history where this user participated
      const allRooms = roomRes.data || [];
      const userRooms = allRooms.filter(r => {
        try {
          const scores = typeof r.player_scores === 'string' ? JSON.parse(r.player_scores) : r.player_scores;
          if (Array.isArray(scores)) return scores.some((s: any) => s.user_id === userId);
          if (scores && typeof scores === 'object') return userId in scores;
        } catch { }
        return false;
      });
      setRoomHistory(userRooms);
      setUserSessions(userSessRes.data || []);
      setDailyPlays(dailyRes.data || []);
      setCategories(catRes.data || []);
      setProfileData(profileRes.data || null);
    } catch (err) {
      console.error('Error fetching user detail data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed overview stats ───────────────────────────────────
  const overview = useMemo(() => {
    if (!user) return null;

    const totalMatchmaking = gameSessions.length;
    const totalCategory = gamePlays.length;
    const totalRoom = roomHistory.length;
    const totalGames = totalMatchmaking + totalCategory + totalRoom;

    const won = gameSessions.filter(s => s.status === 'won').length;
    const winRate = totalMatchmaking > 0 ? Math.round((won / totalMatchmaking) * 100) : 0;

    const totalTimeSeconds = userSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

    const uniqueDays = new Set(userSessions.map(s => s.session_start?.slice(0, 10))).size;

    const avgSessionDuration = userSessions.length > 0
      ? Math.round(totalTimeSeconds / userSessions.length)
      : 0;

    const bounces = userSessions.filter(s => s.is_bounce).length;
    const bounceRate = userSessions.length > 0 ? Math.round((bounces / userSessions.length) * 100) : 0;

    // Favorite category
    const catCounts = new Map<string, number>();
    gamePlays.forEach(p => {
      if (p.category_id) catCounts.set(p.category_id, (catCounts.get(p.category_id) || 0) + 1);
    });
    let favCatId = '';
    let maxPlays = 0;
    catCounts.forEach((count, id) => { if (count > maxPlays) { maxPlays = count; favCatId = id; } });
    const favCat = categories.find(c => c.id === favCatId);

    return {
      totalGames, totalMatchmaking, totalCategory, totalRoom,
      winRate, totalTimeSeconds, uniqueDays,
      currentStreak: profileData?.current_streak ?? '—',
      bestStreak: profileData?.best_streak ?? '—',
      favCategory: favCat?.name || '—',
      avgSessionDuration, bounceRate,
    };
  }, [gameSessions, gamePlays, roomHistory, userSessions, user, categories, profileData]);

  // ── Category breakdown ────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { plays: number; totalScore: number; totalQuestions: number; maxLevel: number }>();
    gamePlays.forEach(p => {
      if (!p.category_id) return;
      const entry = map.get(p.category_id) || { plays: 0, totalScore: 0, totalQuestions: 0, maxLevel: 0 };
      entry.plays++;
      entry.totalScore += p.score || 0;
      entry.totalQuestions += p.total_questions || 0;
      entry.maxLevel = Math.max(entry.maxLevel, p.level_number || 0);
      map.set(p.category_id, entry);
    });
    return Array.from(map.entries()).map(([catId, data]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        categoryId: catId,
        name: cat?.name || 'Unknown',
        icon: cat?.icon || '❓',
        color: cat?.color || '#888',
        ...data,
        avgScore: data.plays > 0 ? Math.round(data.totalScore / data.plays) : 0,
        accuracy: data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0,
      };
    }).sort((a, b) => b.plays - a.plays);
  }, [gamePlays, categories]);

  // ── Sessions & activity ───────────────────────────────────────
  const activityHeatmap = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    userSessions.forEach(s => {
      const d = new Date(s.session_start);
      hourCounts[d.getHours()]++;
      dayCounts[d.getDay()]++;
    });
    return { hourCounts, dayCounts };
  }, [userSessions]);

  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    userSessions.forEach(s => {
      const device = s.device_type || 'Unknown';
      map.set(device, (map.get(device) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [userSessions]);

  if (!user) return null;

  const dayNames = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{user.nickname.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{user.nickname}</h2>
                {user.isVip && <Crown className="h-4 w-4 text-amber-500" />}
                <span className="text-xl">{countryFlag(user.country_code)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-amber-500" />
                  {user.coins.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Gem className="h-3 w-3 text-purple-500" />
                  {user.gems.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Gamepad2 className="h-3 w-3" />
                  {user.games_played} games
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="border-b border-border/50 px-5">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="games" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs">
                Game History
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs">
                Categories
              </TabsTrigger>
              <TabsTrigger value="sessions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs">
                Sessions
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(90vh-180px)]">
            {/* ── Tab 1: Overview ──────────────────────────────── */}
            <TabsContent value="overview" className="p-5 mt-0">
              {loading ? <TabSpinner /> : overview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat icon={<Gamepad2 className="h-4 w-4" />} label="Total Games" value={overview.totalGames} />
                  <MiniStat icon={<Trophy className="h-4 w-4" />} label="Win Rate" value={`${overview.winRate}%`} />
                  <MiniStat icon={<Clock className="h-4 w-4" />} label="Time Spent" value={formatDuration(overview.totalTimeSeconds)} />
                  <MiniStat icon={<Eye className="h-4 w-4" />} label="Return Visits" value={overview.uniqueDays} />
                  <MiniStat icon={<Flame className="h-4 w-4" />} label="Best Streak" value={overview.bestStreak} />
                  <MiniStat icon={<Star className="h-4 w-4" />} label="Fav Category" value={overview.favCategory} />
                  <MiniStat icon={<Activity className="h-4 w-4" />} label="Avg Session" value={formatDuration(overview.avgSessionDuration)} />
                  <MiniStat icon={<TrendingUp className="h-4 w-4" />} label="Bounce Rate" value={`${overview.bounceRate}%`} />
                </div>
              )}
            </TabsContent>

            {/* ── Tab 2: Game History ──────────────────────────── */}
            <TabsContent value="games" className="p-5 mt-0 space-y-6">
              {loading ? <TabSpinner /> : (
                <>
                  {/* Matchmaking */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-primary" /> Matchmaking ({gameSessions.length})
                    </h3>
                    {gameSessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No matchmaking games</p>
                    ) : (
                      <div className="border border-border/50 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_60px_60px_70px_100px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border/30 bg-muted/30">
                          <div>Opponent</div>
                          <div>You</div>
                          <div>Opp</div>
                          <div>Result</div>
                          <div>Date</div>
                        </div>
                        {gameSessions.slice(0, 20).map(s => (
                          <div key={s.id} className="grid grid-cols-[1fr_60px_60px_70px_100px] gap-2 px-3 py-2 text-xs border-b border-border/20 last:border-0">
                            <div className="truncate flex items-center gap-1">
                              {countryFlag(s.opponent_country)} {s.opponent_name}
                            </div>
                            <div className="font-medium">{s.user_score ?? '—'}</div>
                            <div className="text-muted-foreground">{s.opponent_score ?? '—'}</div>
                            <div>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
                                s.status === 'won' && "border-emerald-500/50 text-emerald-600",
                                s.status === 'lost' && "border-red-500/50 text-red-600",
                              )}>
                                {s.status || '—'}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ka })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category Games */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Category Games ({gamePlays.length})
                    </h3>
                    {gamePlays.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No category games</p>
                    ) : (
                      <div className="border border-border/50 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_50px_50px_50px_100px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border/30 bg-muted/30">
                          <div>Category</div>
                          <div>Level</div>
                          <div>Score</div>
                          <div>Stars</div>
                          <div>Date</div>
                        </div>
                        {gamePlays.slice(0, 20).map(p => {
                          const cat = categories.find(c => c.id === p.category_id);
                          return (
                            <div key={p.id} className="grid grid-cols-[1fr_50px_50px_50px_100px] gap-2 px-3 py-2 text-xs border-b border-border/20 last:border-0">
                              <div className="truncate">{cat?.name || 'Unknown'}</div>
                              <div>{p.level_number || '—'}</div>
                              <div className="font-medium">{p.score ?? '—'}</div>
                              <div className="text-amber-500">{'★'.repeat(p.stars_earned || 0)}</div>
                              <div className="text-muted-foreground text-[10px]">
                                {formatDistanceToNow(new Date(p.played_at), { addSuffix: true, locale: ka })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Room Games */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" /> Room Games ({roomHistory.length})
                    </h3>
                    {roomHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No room games</p>
                    ) : (
                      <div className="border border-border/50 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_70px_100px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border/30 bg-muted/30">
                          <div>Room</div>
                          <div>Won</div>
                          <div>Date</div>
                        </div>
                        {roomHistory.slice(0, 20).map(r => {
                          const won = r.winner_user_id === user?.user_id;
                          return (
                            <div key={r.id} className="grid grid-cols-[1fr_70px_100px] gap-2 px-3 py-2 text-xs border-b border-border/20 last:border-0">
                              <div className="truncate text-muted-foreground">{r.room_id?.slice(0, 8)}…</div>
                              <div>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
                                  won && "border-emerald-500/50 text-emerald-600",
                                  !won && "border-muted-foreground/30 text-muted-foreground",
                                )}>
                                  {won ? 'Won' : 'Lost'}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground text-[10px]">
                                {r.played_at ? formatDistanceToNow(new Date(r.played_at), { addSuffix: true, locale: ka }) : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Tab 3: Category Breakdown ────────────────────── */}
            <TabsContent value="categories" className="p-5 mt-0">
              {loading ? <TabSpinner /> : categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No category play data yet</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.map(cat => {
                    const maxPlaysInList = categoryBreakdown[0]?.plays || 1;
                    const barWidth = Math.max(5, (cat.plays / maxPlaysInList) * 100);
                    return (
                      <div key={cat.categoryId} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{cat.plays} plays</Badge>
                        </div>
                        {/* Bar */}
                        <div className="h-2 bg-muted rounded-full mb-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barWidth}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                          <div>Avg Score: <span className="text-foreground font-medium">{cat.avgScore}</span></div>
                          <div>Accuracy: <span className="text-foreground font-medium">{cat.accuracy}%</span></div>
                          <div>Max Level: <span className="text-foreground font-medium">{cat.maxLevel || '—'}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Tab 4: Sessions & Behavior ───────────────────── */}
            <TabsContent value="sessions" className="p-5 mt-0 space-y-6">
              {loading ? <TabSpinner /> : (
                <>
                  {/* Activity Pattern */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Activity Pattern</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="mb-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Active Days</p>
                        <div className="flex gap-1">
                          {dayNames.map((day, i) => {
                            const maxDay = Math.max(...activityHeatmap.dayCounts, 1);
                            const opacity = activityHeatmap.dayCounts[i] / maxDay;
                            return (
                              <div key={day} className="flex-1 text-center">
                                <div
                                  className="h-6 rounded-sm mb-0.5"
                                  style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(0.08, opacity)})` }}
                                />
                                <span className="text-[9px] text-muted-foreground">{day}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Active Hours</p>
                        <div className="flex gap-[2px]">
                          {activityHeatmap.hourCounts.map((count, i) => {
                            const maxHour = Math.max(...activityHeatmap.hourCounts, 1);
                            const opacity = count / maxHour;
                            return (
                              <div key={i} className="flex-1 text-center">
                                <div
                                  className="h-4 rounded-sm"
                                  style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(0.05, opacity)})` }}
                                  title={`${i}:00 - ${count} sessions`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Device breakdown + Daily Plays side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Device info */}
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Devices</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {deviceBreakdown.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No device data</p>
                        ) : (
                          <div className="space-y-2">
                            {deviceBreakdown.map(([device, count]) => (
                              <div key={device} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {device.toLowerCase().includes('mobile') ?
                                    <Smartphone className="h-3 w-3 text-muted-foreground" /> :
                                    <Monitor className="h-3 w-3 text-muted-foreground" />
                                  }
                                  <span className="capitalize">{device}</span>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Daily plays */}
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Daily Plays (Last 30d)</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {dailyPlays.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No daily play data</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {dailyPlays.slice(0, 15).map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{d.play_date}</span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Play className="h-3 w-3" /> {d.plays_used}
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Eye className="h-3 w-3" /> {d.ads_watched_today || 0} ads
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Session Timeline */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Recent Sessions ({userSessions.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {userSessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No session data</p>
                      ) : (
                        <div className="border border-border/50 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[110px_60px_50px_1fr_1fr_70px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border/30 bg-muted/30">
                            <div>Start</div>
                            <div>Duration</div>
                            <div>Pages</div>
                            <div>Entry</div>
                            <div>Device</div>
                            <div>Bounce</div>
                          </div>
                          {userSessions.slice(0, 20).map(s => (
                            <div key={s.id} className="grid grid-cols-[110px_60px_50px_1fr_1fr_70px] gap-2 px-3 py-2 text-xs border-b border-border/20 last:border-0">
                              <div className="text-[10px] text-muted-foreground">
                                {format(new Date(s.session_start), 'MMM d, HH:mm')}
                              </div>
                              <div className="font-medium">{s.duration_seconds ? formatDuration(s.duration_seconds) : '—'}</div>
                              <div>{s.pages_visited || '—'}</div>
                              <div className="truncate text-muted-foreground text-[10px]">{s.entry_page || '—'}</div>
                              <div className="truncate text-[10px]">
                                {[s.device_type, s.browser].filter(Boolean).join(' · ') || '—'}
                              </div>
                              <div>
                                {s.is_bounce && <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-500/30 text-red-500">bounce</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
