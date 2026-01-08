import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { ChevronDown, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@/locales';

interface LastActiveUsersPanelProps {
  users: ActiveUser[];
}

// All 20 supported regions from LANGUAGES
const REGIONS = [
  { code: 'all', name: 'ყველა', flag: '🌍' },
  ...LANGUAGES.map(lang => ({
    code: lang.region,
    name: lang.nativeName,
    flag: lang.flag,
  }))
];

export function LastActiveUsersPanel({ users }: LastActiveUsersPanelProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'vip' | 'free'>('all');
  
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const isOnline = (user: ActiveUser) => {
    return user.status === 'online' && user.last_seen >= twoMinutesAgo;
  };

  const formatLastSeen = (lastSeen: string, online: boolean) => {
    if (online) return 'ახლა';
    return formatDistanceToNow(new Date(lastSeen), { 
      addSuffix: false, 
      locale: ka 
    }) + ' წინ';
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (selectedRegion !== 'all') {
      const userRegion = (user.country_code || user.region || 'ge').toLowerCase();
      if (userRegion !== selectedRegion) return false;
    }
    // VIP filter would need VIP data - for now show all
    return true;
  });

  const onlineCount = filteredUsers.filter(u => isOnline(u)).length;
  const totalCount = filteredUsers.length;
  const selectedRegionData = REGIONS.find(r => r.code === selectedRegion) || REGIONS[0];
  return (
    <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-card border-l border-border shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold">ბოლოს აქტიური</h3>
        </div>
        
        {/* Stats with filters */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-emerald-500 font-medium">{onlineCount} ონლაინ</span>
          <span>•</span>
          <span>{totalCount} სულ</span>
        </div>
        
        {/* Filter row */}
        <div className="flex items-center gap-2 mt-3">
          {/* Region dropdown - using Popover for clean styling */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-background min-w-[100px] justify-between">
                <span className="flex items-center gap-1.5">
                  <span>{selectedRegionData?.flag}</span>
                  <span className="truncate">{selectedRegionData?.name || 'ყველა'}</span>
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="start" 
              sideOffset={4}
              className="w-[200px] p-0 bg-popover border border-border shadow-lg z-[100]"
            >
              <ScrollArea className="h-[280px]">
                <div className="p-1">
                  {REGIONS.map(region => (
                    <button 
                      key={region.code}
                      onClick={() => setSelectedRegion(region.code)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm transition-colors text-left",
                        selectedRegion === region.code 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-sm">{region.flag}</span>
                      <span className="flex-1">{region.name}</span>
                      {selectedRegion === region.code && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* VIP/Free toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setUserTypeFilter('all')}
              className={cn(
                "px-2 py-1 text-xs transition-colors",
                userTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              )}
            >
              ყველა
            </button>
            <button
              onClick={() => setUserTypeFilter('vip')}
              className={cn(
                "px-2 py-1 text-xs border-l border-border transition-colors",
                userTypeFilter === 'vip' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              )}
            >
              VIP
            </button>
            <button
              onClick={() => setUserTypeFilter('free')}
              className={cn(
                "px-2 py-1 text-xs border-l border-border transition-colors",
                userTypeFilter === 'free' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              )}
            >
              Free
            </button>
          </div>
        </div>
      </div>

      {/* User list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs">მომხმარებელი არ მოიძებნა</p>
            </div>
          ) : (
            filteredUsers.slice(0, 30).map((user) => {
              const online = isOnline(user);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {user.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                        online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                      )}
                    />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.nickname}</p>
                    <p className={cn(
                      "text-xs",
                      online ? 'text-emerald-500' : 'text-muted-foreground'
                    )}>
                      {formatLastSeen(user.last_seen, online)}
                    </p>
                  </div>

                  {/* Flag on right */}
                  {(user.country_code || user.region) && (
                    <img
                      src={`https://flagcdn.com/24x18/${(user.country_code || user.region || 'ge').toLowerCase()}.png`}
                      alt={user.country_code || user.region || ''}
                      className="w-6 h-[18px] rounded-[3px] object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://flagcdn.com/24x18/ge.png';
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
