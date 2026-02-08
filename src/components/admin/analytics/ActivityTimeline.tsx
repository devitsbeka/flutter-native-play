import { useEffect, useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DayStat {
  label: string;
  games: number;
}

export function ActivityTimeline() {
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

      // Games by day period
      const [todayRes, yesterdayRes, weekRes] = await Promise.all([
        supabase.from('game_plays').select('*', { count: 'exact', head: true }).gte('played_at', today),
        supabase.from('game_plays').select('*', { count: 'exact', head: true }).gte('played_at', yesterday).lt('played_at', today),
        supabase.from('game_plays').select('*', { count: 'exact', head: true }).gte('played_at', weekAgo),
      ]);

      setDayStats([
        { label: 'დღეს', games: todayRes.count || 0 },
        { label: 'გუშინ', games: yesterdayRes.count || 0 },
        { label: 'ბოლო 7 დღე', games: weekRes.count || 0 },
      ]);

      // Hourly distribution (today's games with timestamps)
      const { data: todayGames } = await supabase
        .from('game_plays')
        .select('played_at')
        .gte('played_at', today);

      const hourMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hourMap.set(h, 0);
      (todayGames || []).forEach(g => {
        const hour = new Date(g.played_at).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      setHourlyData(
        Array.from(hourMap.entries())
          .map(([hour, count]) => ({ hour, count }))
          .sort((a, b) => a.hour - b.hour)
      );
    } catch (err) {
      console.error('Error fetching activity timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxHourly = Math.max(...hourlyData.map(h => h.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          აქტივობის ტაიმლაინი
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Day comparison */}
            <div className="grid grid-cols-3 gap-2">
              {dayStats.map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{stat.games}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Hourly chart */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                დღევანდელი აქტივობა საათების მიხედვით
              </p>
              <div className="flex items-end gap-[2px] h-20">
                {hourlyData.map(({ hour, count }) => (
                  <div
                    key={hour}
                    className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary group relative"
                    style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '1px' }}
                    title={`${hour}:00 - ${count} თამაშები`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}