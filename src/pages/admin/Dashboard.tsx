import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  HelpCircle, 
  Users,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';
import { AiMagicRefillModal } from '@/components/admin/AiMagicRefillModal';
import { PalantirAnalyticsWidget } from '@/components/admin/PalantirAnalyticsWidget';

export default function AdminDashboard() {
  const { categories } = useAdminCategories();
  const { onlineUsers, onlineCount, awayCount } = useOnlineUsers();
  const [totalGameSessions, setTotalGameSessions] = useState(0);
  const [showMagicRefill, setShowMagicRefill] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch game sessions count
      const { count: sessionsCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      
      // Fetch total questions count (bypasses 1000 row limit)
      const { count: totalQ } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      // Fetch active questions count
      const { count: activeQ } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      setTotalGameSessions(sessionsCount || 0);
      setTotalQuestions(totalQ || 0);
      setActiveQuestions(activeQ || 0);
    };
    fetchStats();
  }, []);

  const stats = [
    {
      title: 'კატეგორიები',
      value: categories.length,
      subValue: `${categories.filter(c => c.is_active).length} აქტიური`,
      icon: FolderOpen,
      gradient: 'from-blue-500 to-cyan-500',
      link: '/admin/categories',
    },
    {
      title: 'კითხვები',
      value: totalQuestions,
      subValue: `${activeQuestions} აქტიური`,
      icon: HelpCircle,
      gradient: 'from-violet-500 to-purple-500',
      link: '/admin/questions',
    },
    {
      title: 'ონლაინ',
      value: onlineCount,
      subValue: `${awayCount} გაშვებული`,
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
                      <p className="text-[10px] text-muted-foreground">{stat.subValue}</p>
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Online Users */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-semibold text-sm">ონლაინ მომხმარებლები</h3>
                </div>
                <span className="text-xs text-muted-foreground">{onlineCount} ონლაინ</span>
              </div>
              
              {onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">ამჟამად ონლაინ არავინ არ არის</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineUsers.slice(0, 6).map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {user.profile?.nickname?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div 
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                            user.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.profile?.nickname || 'უცნობი'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {user.current_page || '/'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Categories */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">კატეგორიები</h3>
                </div>
                <NavLink to="/admin/categories" className="text-xs text-primary hover:underline">
                  ყველა
                </NavLink>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {categories.slice(0, 6).map((cat) => (
                  <div 
                    key={cat.id}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-all",
                      cat.is_active ? "bg-muted/50 hover:bg-muted" : "bg-muted/30 opacity-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br",
                      cat.color
                    )}>
                      {cat.icon}
                    </div>
                    <span className="text-xs font-medium truncate w-full">{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">
                {categories.filter(c => c.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">აქტიური კატეგორიები</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-violet-500">
                {activeQuestions}
              </p>
              <p className="text-xs text-muted-foreground">აქტიური კითხვები</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">
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
