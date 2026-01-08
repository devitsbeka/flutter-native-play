import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { cn } from '@/lib/utils';

interface LastActiveUsersPanelProps {
  users: ActiveUser[];
}

export function LastActiveUsersPanel({ users }: LastActiveUsersPanelProps) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const isOnline = (user: ActiveUser) => {
    return user.status === 'online' && user.last_seen >= twoMinutesAgo;
  };

  const formatLastSeen = (lastSeen: string, online: boolean) => {
    if (online) return 'ახლა';
    return formatDistanceToNow(new Date(lastSeen), { 
      addSuffix: true, 
      locale: ka 
    });
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-card/95 backdrop-blur-md border-l border-border shadow-lg">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold text-sm">ბოლოს აქტიური</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {users.filter(u => isOnline(u)).length} ონლაინ • {users.length} სულ
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-2 space-y-1">
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs">ბოლო 24 საათში აქტივობა არ არის</p>
            </div>
          ) : (
            users.slice(0, 20).map((user) => {
              const online = isOnline(user);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.nickname}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {user.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                        online ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{user.nickname}</p>
                      {(user.country_code || user.region) && (
                        <img
                          src={`https://flagcdn.com/16x12/${(user.country_code || user.region || 'ge').toLowerCase()}.png`}
                          alt={user.country_code || user.region || ''}
                          className="w-4 h-3 rounded-[2px] object-cover"
                          onError={(e) => {
                            // Fallback to Georgia flag if country code is invalid
                            (e.target as HTMLImageElement).src = 'https://flagcdn.com/16x12/ge.png';
                          }}
                        />
                      )}
                    </div>
                    <p className={cn(
                      "text-[10px]",
                      online ? 'text-emerald-500' : 'text-muted-foreground'
                    )}>
                      {formatLastSeen(user.last_seen, online)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
