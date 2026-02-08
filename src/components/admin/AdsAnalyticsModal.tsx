import { useEffect, useState } from 'react';
import { Play, TrendingUp, Users, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface TopAdWatcher {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  ads_count: number;
}

export function AdsAnalyticsModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [yesterdayTotal, setYesterdayTotal] = useState(0);
  const [uniqueWatchers, setUniqueWatchers] = useState(0);
  const [avgPerUser, setAvgPerUser] = useState(0);
  const [topWatchers, setTopWatchers] = useState<TopAdWatcher[]>([]);

  useEffect(() => {
    if (isOpen) fetchStats();
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Today's ads
      const { data: todayData } = await supabase
        .from('user_daily_plays')
        .select('user_id, plays_from_ads, ads_watched_today')
        .eq('play_date', today);

      // Yesterday's ads
      const { data: yesterdayData } = await supabase
        .from('user_daily_plays')
        .select('plays_from_ads, ads_watched_today')
        .eq('play_date', yesterday);

      const todayAds = (todayData || []).reduce((sum, d) => sum + (d.ads_watched_today || d.plays_from_ads || 0), 0);
      const yesterdayAds = (yesterdayData || []).reduce((sum, d) => sum + (d.ads_watched_today || d.plays_from_ads || 0), 0);
      const watchersCount = (todayData || []).filter(d => (d.ads_watched_today || d.plays_from_ads || 0) > 0).length;

      setTodayTotal(todayAds);
      setYesterdayTotal(yesterdayAds);
      setUniqueWatchers(watchersCount);
      setAvgPerUser(watchersCount > 0 ? Math.round((todayAds / watchersCount) * 10) / 10 : 0);

      // Top ad watchers
      if (todayData && todayData.length > 0) {
        const sorted = todayData
          .map(d => ({ user_id: d.user_id, ads_count: d.ads_watched_today || d.plays_from_ads || 0 }))
          .filter(d => d.ads_count > 0)
          .sort((a, b) => b.ads_count - a.ads_count)
          .slice(0, 10);

        if (sorted.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url')
            .in('user_id', sorted.map(s => s.user_id));

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          setTopWatchers(sorted.map(s => ({
            user_id: s.user_id,
            nickname: profileMap.get(s.user_id)?.nickname || 'Unknown',
            avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
            ads_count: s.ads_count,
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching ads analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const trend = todayTotal - yesterdayTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            რეკლამის ანალიტიკა
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{todayTotal}</p>
                  <p className="text-xs text-muted-foreground">დღეს ნანახი</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{yesterdayTotal}</p>
                  <p className="text-xs text-muted-foreground">გუშინ ნანახი</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{uniqueWatchers}</p>
                  <p className="text-xs text-muted-foreground">უნიკ. მნახველი</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{avgPerUser}</p>
                  <p className="text-xs text-muted-foreground">საშ. / მომხმ.</p>
                </CardContent>
              </Card>
            </div>

            {/* Trend */}
            <div className="flex items-center gap-2 justify-center text-sm">
              <TrendingUp className={`h-4 w-4 ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className={trend >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {trend >= 0 ? '+' : ''}{trend} გუშინთან შედარებით
              </span>
            </div>

            {/* Top watchers */}
            {topWatchers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">ტოპ მნახველები</h4>
                <div className="space-y-1.5">
                  {topWatchers.map((watcher, i) => (
                    <div key={watcher.user_id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}.</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={watcher.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{watcher.nickname.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{watcher.nickname}</span>
                      <span className="text-xs font-mono text-muted-foreground">{watcher.ads_count} რეკლამა</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}