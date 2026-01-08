import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  HelpCircle, 
  Users,
  Activity,
  ArrowUpRight,
  Sparkles,
  Play,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { AiMagicRefillModal } from '@/components/admin/AiMagicRefillModal';
import { PalantirAnalyticsWidget } from '@/components/admin/PalantirAnalyticsWidget';
import { AdminMap } from '@/components/admin/AdminMap';
import { LastActiveUsersPanel } from '@/components/admin/LastActiveUsersPanel';

export default function AdminDashboard() {
  const { categories } = useAdminCategories();
  const { activeUsers, onlineUsers, recentlyActiveUsers } = useActiveUsers();
  const [totalGameSessions, setTotalGameSessions] = useState(0);
  const [showMagicRefill, setShowMagicRefill] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState(0);
  const [adsWatched, setAdsWatched] = useState(0);
  const [appStoreRanking, setAppStoreRanking] = useState({ position: 0, change: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch games played today from game_plays table (tracks every game)
      const [gamePlaysToday, roomGames] = await Promise.all([
        // Category games from game_plays
        supabase
          .from('game_plays')
          .select('*', { count: 'exact', head: true })
          .gte('played_at', today),
        // Multiplayer games
        supabase
          .from('room_games')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today),
      ]);
      
      const totalGamesToday = (gamePlaysToday.count || 0) + (roomGames.count || 0);
      
      // Fetch total questions count
      const { count: totalQ } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      // Fetch active questions count
      const { count: activeQ } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Fetch ads watched today (from user_daily_plays)
      const { data: adsData } = await supabase
        .from('user_daily_plays')
        .select('plays_from_ads')
        .eq('play_date', today);
      
      const totalAdsWatched = adsData?.reduce((sum, d) => sum + (d.plays_from_ads || 0), 0) || 0;
      
      setTotalGameSessions(totalGamesToday);
      setTotalQuestions(totalQ || 0);
      setActiveQuestions(activeQ || 0);
      setAdsWatched(totalAdsWatched);
      // Mock app store ranking - replace with real API if available
      setAppStoreRanking({ position: 47, change: 3 });
    };
    fetchStats();
  }, []);

  const stats = [
    {
      title: 'ონლაინ',
      value: onlineUsers.length,
      subValue: `${recentlyActiveUsers.length} ბოლოს`,
      icon: Users,
      gradient: 'from-emerald-500 to-teal-500',
      link: '/admin/users',
    },
    {
      title: 'დღეს თამაშები',
      value: totalGameSessions,
      subValue: 'სესიები',
      icon: Activity,
      gradient: 'from-amber-500 to-orange-500',
      link: null,
    },
    {
      title: 'რეკლამა ნანახი',
      value: adsWatched,
      subValue: 'დღეს',
      icon: Play,
      gradient: 'from-pink-500 to-rose-500',
      link: null,
    },
    {
      title: 'App Store',
      value: `#${appStoreRanking.position}`,
      subValue: appStoreRanking.change > 0 ? `↑ ${appStoreRanking.change}` : appStoreRanking.change < 0 ? `↓ ${Math.abs(appStoreRanking.change)}` : 'უცვლელი',
      subValueColor: appStoreRanking.change > 0 ? 'text-emerald-500' : appStoreRanking.change < 0 ? 'text-red-500' : undefined,
      icon: appStoreRanking.change >= 0 ? TrendingUp : TrendingDown,
      gradient: appStoreRanking.change >= 0 ? 'from-blue-500 to-indigo-500' : 'from-red-500 to-rose-500',
      link: null,
    },
  ];

  return (
    <>
      <AiMagicRefillModal
        isOpen={showMagicRefill}
        onClose={() => setShowMagicRefill(false)}
        categories={categories}
      />

      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Compact Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">დეშბორდი</h1>
                <p className="text-sm text-muted-foreground">მიმოხილვა</p>
              </div>
            </div>
            <Button
              onClick={() => setShowMagicRefill(true)}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Magic Refill
            </Button>
          </div>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const content = (
              <Card className="group relative overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                      <p className={cn("text-[10px] text-muted-foreground", (stat as any).subValueColor)}>{stat.subValue}</p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br text-white",
                      stat.gradient
                    )}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  {stat.link && (
                    <ArrowUpRight className="absolute top-2 right-2 h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </CardContent>
              </Card>
            );

            return stat.link ? (
              <NavLink key={stat.title} to={stat.link}>
                {content}
              </NavLink>
            ) : (
              <div key={stat.title}>{content}</div>
            );
          })}
        </div>

        {/* Globe with Active Users Panel */}
        <Card className="relative overflow-hidden h-[420px]">
          <AdminMap users={activeUsers} />
          <LastActiveUsersPanel users={activeUsers} />
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {categories.filter(c => c.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">აქტიური კატეგორიები</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {activeQuestions}
              </p>
              <p className="text-xs text-muted-foreground">აქტიური კითხვები</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {Math.round(totalQuestions / Math.max(categories.length, 1))}
              </p>
              <p className="text-xs text-muted-foreground">საშ. კითხვა/კატეგ.</p>
            </CardContent>
          </Card>
        </div>

        {/* Palantir Analytics Widget */}
        <PalantirAnalyticsWidget />
        </div>
      </ScrollArea>
    </>
  );
}
