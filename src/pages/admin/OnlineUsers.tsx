import { 
  Users, 
  Loader2,
  Circle,
  Clock,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

export default function AdminOnlineUsers() {
  const { onlineUsers, loading, onlineCount, awayCount, totalActive } = useOnlineUsers();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Users className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ონლაინ მომხმარებლები</h1>
            <p className="text-muted-foreground">რეალურ დროში მომხმარებლების თვალყურის დევნება</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Circle className="h-5 w-5 text-green-500 fill-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-sm text-muted-foreground">ონლაინ</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Circle className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{awayCount}</p>
                <p className="text-sm text-muted-foreground">გაშვებული</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-sm text-muted-foreground">სულ აქტიური</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>აქტიური მომხმარებლები</CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ამჟამად ონლაინ მომხმარებლები არ არიან</p>
              </div>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {user.profile?.avatar_url ? (
                        <img 
                          src={user.profile.avatar_url} 
                          alt={user.profile.nickname}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                          {user.profile?.nickname?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div 
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                          user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {user.profile?.nickname || 'უცნობი მომხმარებელი'}
                        </p>
                        {user.profile?.country_code && (
                          <span className="text-sm">
                            {getFlagEmoji(user.profile.country_code)}
                          </span>
                        )}
                        <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                          {user.status === 'online' ? 'ონლაინ' : 'გაშვებული'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.current_page || '/'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(user.last_seen), { 
                            addSuffix: true, 
                            locale: ka 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
