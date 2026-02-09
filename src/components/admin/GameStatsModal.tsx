import { useEffect, useState } from 'react';
import { Gamepad2, Users, Trophy, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResolvedAvatarImage } from '@/components/ui/resolved-avatar-image';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface TopPlayer {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  count: number;
}

interface CategoryStat {
  category_name: string;
  count: number;
}

export function GameStatsModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [categoryGames, setCategoryGames] = useState(0);
  const [multiplayerGames, setMultiplayerGames] = useState(0);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  useEffect(() => {
    if (isOpen) fetchStats();
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Category games
      const { count: catCount } = await supabase
        .from('game_plays')
        .select('*', { count: 'exact', head: true })
        .gte('played_at', today)
        .eq('game_type', 'category');

      // Multiplayer games
      const { count: multiCount } = await supabase
        .from('room_games')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setCategoryGames(catCount || 0);
      setMultiplayerGames(multiCount || 0);

      // Top players today
      const { data: playsData } = await supabase
        .from('game_plays')
        .select('user_id')
        .gte('played_at', today);

      if (playsData && playsData.length > 0) {
        const countMap = new Map<string, number>();
        playsData.forEach(p => {
          countMap.set(p.user_id, (countMap.get(p.user_id) || 0) + 1);
        });

        const topIds = Array.from(countMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', topIds.map(t => t[0]));

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        setTopPlayers(topIds.map(([uid, count]) => ({
          user_id: uid,
          nickname: profileMap.get(uid)?.nickname || 'Unknown',
          avatar_url: profileMap.get(uid)?.avatar_url || null,
          count,
        })));
      }

      // Games by category
      const { data: catPlays } = await supabase
        .from('game_plays')
        .select('category_id')
        .gte('played_at', today)
        .not('category_id', 'is', null);

      if (catPlays && catPlays.length > 0) {
        const catMap = new Map<string, number>();
        catPlays.forEach(p => {
          if (p.category_id) catMap.set(p.category_id, (catMap.get(p.category_id) || 0) + 1);
        });

        const catIds = Array.from(catMap.keys());
        const { data: cats } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', catIds);

        const nameMap = new Map((cats || []).map(c => [c.id, c.name]));
        setCategoryStats(
          Array.from(catMap.entries())
            .map(([id, count]) => ({ category_name: nameMap.get(id) || id, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      }
    } catch (err) {
      console.error('Error fetching game stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            დღევანდელი თამაშების სტატისტიკა
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <FolderOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{categoryGames}</p>
                  <p className="text-xs text-muted-foreground">კატეგორიის თამაშები</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{multiplayerGames}</p>
                  <p className="text-xs text-muted-foreground">მულტიპლეიერი</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Players */}
            {topPlayers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  ტოპ მოთამაშეები დღეს
                </h4>
                <div className="space-y-1.5">
                  {topPlayers.map((player, i) => (
                    <div key={player.user_id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}.</span>
                      <Avatar className="h-6 w-6">
                        <ResolvedAvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{player.nickname.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{player.nickname}</span>
                      <span className="text-xs font-mono text-muted-foreground">{player.count} თამაში</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category popularity */}
            {categoryStats.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  პოპულარული კატეგორიები
                </h4>
                <div className="space-y-1">
                  {categoryStats.map(cat => (
                    <div key={cat.category_name} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{cat.category_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{cat.count}</span>
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