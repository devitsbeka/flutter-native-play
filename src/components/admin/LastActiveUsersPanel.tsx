import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { ChevronDown, Check, Crown } from 'lucide-react';
import { SafeAvatarImage } from '@/components/shared/SafeAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@/locales';
import { usePlayerProfile } from '@/contexts/PlayerProfileContext';

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

type UserTypeFilter = 'all' | 'vip' | 'free';

const FILTER_OPTIONS: { value: UserTypeFilter; label: string }[] = [
  { value: 'all', label: 'ყველა' },
  { value: 'vip', label: 'VIP' },
  { value: 'free', label: 'Free' },
];

export function LastActiveUsersPanel({ users }: LastActiveUsersPanelProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  const [regionOpen, setRegionOpen] = useState(false);
  const { openProfile } = usePlayerProfile();
  
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

  // Filter users - now actually working!
  const filteredUsers = users.filter(user => {
    // Region filter
    if (selectedRegion !== 'all') {
      const userRegion = (user.country_code || user.region || '').toLowerCase();
      if (userRegion !== selectedRegion) return false;
    }
    
    // VIP/Free filter
    if (userTypeFilter === 'vip' && !user.isVip) return false;
    if (userTypeFilter === 'free' && (user.isVip || user.isGuest)) return false;
    
    return true;
  });

  const onlineCount = filteredUsers.filter(u => isOnline(u)).length;
  const totalCount = filteredUsers.length;
  const selectedRegionData = REGIONS.find(r => r.code === selectedRegion) || REGIONS[0];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-card border-l border-border shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold">ბოლოს აქტიური</h3>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-500 font-medium">{onlineCount} ონლაინ</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{totalCount} სულ</span>
        </div>
        
        {/* Filters - cleaner design */}
        <div className="flex items-center gap-2">
          {/* Region dropdown */}
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <button className="h-8 px-3 text-xs flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <span className="text-sm">{selectedRegionData?.flag}</span>
                <span className="max-w-[60px] truncate">{selectedRegionData?.name}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="start" 
              sideOffset={4}
              className="w-[180px] p-1 bg-popover border border-border shadow-xl z-[100]"
            >
              <ScrollArea className="h-[250px]">
                {REGIONS.map(region => (
                  <button 
                    key={region.code}
                    onClick={() => {
                      setSelectedRegion(region.code);
                      setRegionOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors text-left",
                      selectedRegion === region.code 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="text-sm">{region.flag}</span>
                    <span className="flex-1 truncate">{region.name}</span>
                    {selectedRegion === region.code && (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* VIP/Free segmented control - cleaner */}
          <div className="flex h-8 rounded-lg bg-muted/50 p-0.5">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setUserTypeFilter(option.value)}
                className={cn(
                  "px-3 text-xs rounded-md transition-all duration-200",
                  userTypeFilter === option.value 
                    ? "bg-background shadow-sm text-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
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
                <button
                  key={user.id}
                  onClick={() => openProfile(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    {user.avatar_url ? (
                      <SafeAvatarImage
                        avatarUrl={user.avatar_url}
                        fallback={user.nickname || '?'}
                        className="w-10 h-10 rounded-full object-cover"
                        containerClassName="w-10 h-10 rounded-full"
                      />
                    ) : user.isGuest ? (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{user.nickname}</p>
                      {user.isVip && (
                        <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className={cn(
                      "text-xs",
                      online ? 'text-emerald-500' : 'text-muted-foreground'
                    )}>
                      {formatLastSeen(user.last_seen, online)}
                    </p>
                  </div>

                  {/* Flag on right */}
                  <div className="flex-shrink-0">
                    {(user.country_code || user.region) ? (
                      <img
                        src={`https://flagcdn.com/24x18/${(user.country_code || user.region).toLowerCase()}.png`}
                        alt={user.country_code || user.region || ''}
                        className="w-6 h-[18px] rounded-[3px] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-base">🌍</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}