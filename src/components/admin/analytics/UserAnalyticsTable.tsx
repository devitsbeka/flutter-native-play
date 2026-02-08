import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { ArrowUpDown, Crown, Coins, Gem, Gamepad2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AnalyticsUser } from '@/pages/admin/UserAnalytics';

interface Props {
  users: AnalyticsUser[];
  loading: boolean;
  sortField: string;
  sortAsc: boolean;
  onToggleSort: (field: 'last_seen' | 'games_played' | 'coins' | 'created_at') => void;
}

const statusConfig = {
  online: { dot: 'bg-emerald-500', label: 'ონლაინ' },
  away: { dot: 'bg-amber-500', label: 'Away' },
  offline: { dot: 'bg-muted-foreground/50', label: 'ოფლაინ' },
};

const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return '🌍';
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
};

export function UserAnalyticsTable({ users, loading, sortField, sortAsc, onToggleSort }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const sortColumns: { field: 'last_seen' | 'games_played' | 'coins' | 'created_at'; label: string }[] = [
    { field: 'last_seen', label: 'ბოლოს ნანახი' },
    { field: 'games_played', label: 'თამაშები' },
    { field: 'coins', label: 'ქოინები' },
    { field: 'created_at', label: 'რეგისტრაცია' },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_100px_80px_120px_100px_120px_100px] gap-2 px-4 py-3 border-b border-border/50 text-xs font-medium text-muted-foreground">
          <div>მომხმარებელი</div>
          <div>სტატუსი</div>
          <div>ქვეყანა</div>
          {sortColumns.map(col => (
            <button
              key={col.field}
              onClick={() => onToggleSort(col.field)}
              className={cn(
                "flex items-center gap-1 hover:text-foreground transition-colors text-left",
                sortField === col.field && "text-primary"
              )}
            >
              {col.label}
              <ArrowUpDown className="h-3 w-3" />
            </button>
          ))}
        </div>

        {/* Table body */}
        <div className="max-h-[500px] overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              მომხმარებლები ვერ მოიძებნა
            </div>
          ) : (
            users.slice(0, 100).map(user => (
              <div
                key={user.user_id}
                className="grid grid-cols-[2fr_100px_80px_120px_100px_120px_100px] gap-2 px-4 py-2.5 border-b border-border/30 hover:bg-accent/30 transition-colors items-center text-sm"
              >
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.nickname.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      statusConfig[user.status].dot
                    )} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{user.nickname}</span>
                      {user.isVip && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    </div>
                    {user.current_page && user.status === 'online' && (
                      <p className="text-[10px] text-muted-foreground truncate">{user.current_page}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      user.status === 'online' && "border-emerald-500/50 text-emerald-600",
                      user.status === 'away' && "border-amber-500/50 text-amber-600",
                      user.status === 'offline' && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {statusConfig[user.status].label}
                  </Badge>
                </div>

                {/* Country */}
                <div className="text-lg" title={user.country_code || 'Unknown'}>
                  {countryFlag(user.country_code)}
                </div>

                {/* Last seen */}
                <div className="text-xs text-muted-foreground">
                  {user.last_seen
                    ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: ka })
                    : '—'}
                </div>

                {/* Games played */}
                <div className="flex items-center gap-1 text-xs">
                  <Gamepad2 className="h-3 w-3 text-muted-foreground" />
                  {user.games_played}
                </div>

                {/* Coins */}
                <div className="flex items-center gap-1 text-xs">
                  <Coins className="h-3 w-3 text-amber-500" />
                  {user.coins.toLocaleString()}
                </div>

                {/* Join date */}
                <div className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>

        {users.length > 100 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/50">
            ნაჩვენებია 100 / {users.length} მომხმარებელი
          </div>
        )}
      </CardContent>
    </Card>
  );
}