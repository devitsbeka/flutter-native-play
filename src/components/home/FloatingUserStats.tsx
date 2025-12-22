import { Flame, Crown, Menu } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Profile } from "@/hooks/useAuth";

interface FloatingUserStatsProps {
  profile: Profile | null;
}

export function FloatingUserStats({ profile }: FloatingUserStatsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Burger Menu + User Avatar */}
      <div className="flex items-center gap-2">
        <button className="liquid-glass h-12 w-12 rounded-2xl flex items-center justify-center">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <button className="liquid-glass h-12 w-12 rounded-2xl flex items-center justify-center">
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="sm"
          />
        </button>
      </div>

      {/* Stats - same height as avatar button */}
      <div className="flex items-center gap-2">
        <div className="liquid-glass h-12 rounded-2xl px-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="font-bold text-foreground">{profile?.current_streak || 0}</span>
        </div>
        <div className="liquid-glass h-12 rounded-2xl px-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <span className="font-bold text-foreground">{profile?.total_points || 0}</span>
        </div>
      </div>
    </div>
  );
}
