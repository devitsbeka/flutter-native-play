import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  HelpCircle, 
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const { categories } = useAdminCategories();
  const { questions } = useAdminQuestions();
  const { onlineUsers, onlineCount, awayCount } = useOnlineUsers();
  const [totalGameSessions, setTotalGameSessions] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      // Get total game sessions from today
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      
      setTotalGameSessions(count || 0);
    };
    fetchStats();
  }, []);

  const stats = [
    {
      title: 'სულ კატეგორიები',
      value: categories.length,
      subValue: `${categories.filter(c => c.is_active).length} აქტიური`,
      icon: FolderOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'სულ კითხვები',
      value: questions.length,
      subValue: `${questions.filter(q => q.is_active).length} აქტიური`,
      icon: HelpCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'ონლაინ მომხმარებლები',
      value: onlineCount,
      subValue: `${awayCount} გაშვებული`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'დღევანდელი თამაშები',
      value: totalGameSessions,
      subValue: 'სესიები',
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">დეშბორდი</h1>
            <p className="text-muted-foreground">სტატისტიკა და მიმოხილვა</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Online Users Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              ახლა ონლაინ მომხმარებლები
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                ამჟამად ონლაინ მომხმარებლები არ არიან
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onlineUsers.slice(0, 9).map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                        {user.profile?.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                          user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.profile?.nickname || 'უცნობი'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              ბოლო კატეგორიები
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.slice(0, 6).map((cat) => (
                <div 
                  key={cat.id}
                  className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg text-center"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-medium truncate w-full">{cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cat.is_active 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {cat.is_active ? 'აქტიური' : 'გამორთული'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
