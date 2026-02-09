import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResolvedAvatarImage } from '@/components/ui/resolved-avatar-image';
import { TrendingUp, TrendingDown, Users, Gamepad2, Target, RotateCcw, Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import type { AnalyticsUser } from '@/pages/admin/UserAnalytics';

interface InsightsTabProps {
  users: AnalyticsUser[];
}

export function InsightsTab({ users }: InsightsTabProps) {
  // 7-day signup trend
  const signupTrend = useMemo(() => {
    const days: { label: string; date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = i === 0 ? 'დღეს' : i === 1 ? 'გუშინ' : d.toLocaleDateString('ka-GE', { weekday: 'short' });
      days.push({ label, date: dateStr, count: 0 });
    }
    users.forEach(u => {
      const uDate = u.created_at.split('T')[0];
      const day = days.find(d => d.date === uDate);
      if (day) day.count++;
    });
    return days;
  }, [users]);

  const todaySignups = signupTrend[signupTrend.length - 1]?.count || 0;
  const yesterdaySignups = signupTrend[signupTrend.length - 2]?.count || 0;
  const growthPct = yesterdaySignups > 0 ? Math.round(((todaySignups - yesterdaySignups) / yesterdaySignups) * 100) : todaySignups > 0 ? 100 : 0;
  const maxSignup = Math.max(...signupTrend.map(d => d.count), 1);

  // Engagement funnel
  const funnel = useMemo(() => {
    const total = users.length;
    const played1 = users.filter(u => u.games_played >= 1).length;
    const played5 = users.filter(u => u.games_played >= 5).length;
    const played10 = users.filter(u => u.games_played >= 10).length;
    return [
      { label: 'რეგისტრაცია', count: total, pct: 100 },
      { label: '1+ თამაში', count: played1, pct: total > 0 ? Math.round((played1 / total) * 100) : 0 },
      { label: '5+ თამაში', count: played5, pct: total > 0 ? Math.round((played5 / total) * 100) : 0 },
      { label: '10+ თამაში', count: played10, pct: total > 0 ? Math.round((played10 / total) * 100) : 0 },
    ];
  }, [users]);

  // Today's new users
  const todaysNewUsers = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return users
      .filter(u => new Date(u.created_at) >= todayStart)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [users]);

  // Retention
  const retention = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekAgoStart = new Date(todayStart);
    weekAgoStart.setDate(weekAgoStart.getDate() - 7);
    const weekAgoEnd = new Date(weekAgoStart);
    weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

    // Day 0: signed up today + played today
    const signedUpToday = users.filter(u => new Date(u.created_at) >= todayStart);
    const day0Played = signedUpToday.filter(u => u.games_played > 0).length;
    const day0Pct = signedUpToday.length > 0 ? Math.round((day0Played / signedUpToday.length) * 100) : 0;

    // Day 1: signed up yesterday + active today (last_seen today)
    const signedUpYesterday = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= yesterdayStart && d < todayStart;
    });
    const day1Returned = signedUpYesterday.filter(u => u.last_seen && new Date(u.last_seen) >= todayStart).length;
    const day1Pct = signedUpYesterday.length > 0 ? Math.round((day1Returned / signedUpYesterday.length) * 100) : 0;

    // Week 1: signed up 7 days ago + active in last 24h
    const signedUpWeekAgo = users.filter(u => {
      const d = new Date(u.created_at);
      return d >= weekAgoStart && d < weekAgoEnd;
    });
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const week1Returned = signedUpWeekAgo.filter(u => u.last_seen && new Date(u.last_seen) >= twentyFourHoursAgo).length;
    const week1Pct = signedUpWeekAgo.length > 0 ? Math.round((week1Returned / signedUpWeekAgo.length) * 100) : 0;

    return {
      day0: { pct: day0Pct, played: day0Played, total: signedUpToday.length },
      day1: { pct: day1Pct, returned: day1Returned, total: signedUpYesterday.length },
      week1: { pct: week1Pct, returned: week1Returned, total: signedUpWeekAgo.length },
    };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Row 1: Signup Trend + Engagement Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signup Trend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">რეგისტრაციების ტრენდი (7 დღე)</CardTitle>
              <div className="flex items-center gap-1.5">
                {growthPct >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={cn(
                  "text-sm font-semibold",
                  growthPct >= 0 ? "text-emerald-500" : "text-destructive"
                )}>
                  {growthPct >= 0 ? '+' : ''}{growthPct}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-end gap-1.5 h-32">
              {signupTrend.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-foreground">{day.count}</span>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all min-h-[4px]",
                      i === signupTrend.length - 1 ? "bg-primary" : "bg-primary/30"
                    )}
                    style={{ height: `${(day.count / maxSignup) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              ჩართულობის Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {funnel.map((step, i) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{step.count}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {step.pct}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      i === 0 ? "bg-primary" : i === 1 ? "bg-primary/70" : i === 2 ? "bg-primary/50" : "bg-primary/30"
                    )}
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Retention + Today's New Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              რეტენცია
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-3 gap-3">
              <RetentionCard
                label="Day 0"
                description="დღეს დარეგ. → ითამაშა"
                pct={retention.day0.pct}
                detail={`${retention.day0.played}/${retention.day0.total}`}
              />
              <RetentionCard
                label="Day 1"
                description="გუშინ დარეგ. → დღეს დაბრუნდა"
                pct={retention.day1.pct}
                detail={`${retention.day1.returned}/${retention.day1.total}`}
              />
              <RetentionCard
                label="Week 1"
                description="7 დღის წინ → აქტიურია"
                pct={retention.week1.pct}
                detail={`${retention.week1.returned}/${retention.week1.total}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Today's New Users */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                დღეს დარეგისტრირდა
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {todaysNewUsers.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {todaysNewUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">დღეს ჯერ არავინ დარეგისტრირებულა</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {todaysNewUsers.map(user => (
                  <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{user.nickname.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {user.status === 'online' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.nickname}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ka })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3" />
                        {user.games_played}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-500" />
                        {user.coins}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RetentionCard({ label, description, pct, detail }: {
  label: string;
  description: string;
  pct: number;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 text-center">
      <span className="text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <div className="relative h-16 w-16 mb-2">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeDasharray={`${pct * 0.974} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {pct}%
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
      <span className="text-[10px] font-medium mt-0.5">{detail}</span>
    </div>
  );
}
