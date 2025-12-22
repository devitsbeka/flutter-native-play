import { Flame, Crown } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Profile } from "@/hooks/useAuth";

interface FloatingUserStatsProps {
  profile: Profile | null;
}

export function FloatingUserStats({ profile }: FloatingUserStatsProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
      {/* User info */}
      <div className="flex items-center gap-3 rounded-2xl bg-background/60 backdrop-blur-md px-3 py-2 border border-border/30">
        <Avatar
          imageUrl={profile?.avatar_url || undefined}
          emoji={profile?.nickname?.charAt(0) || "👤"}
          size="sm"
          showRing
          ringColor="ring-primary/30"
        />
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground">Welcome back!</p>
          <p className="text-sm font-semibold text-foreground">
            {profile?.nickname || "Trivia Master"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-md px-3 py-1.5 border border-border/30">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-bold text-sm text-foreground">{profile?.current_streak || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-md px-3 py-1.5 border border-border/30">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="font-bold text-sm text-foreground">{profile?.total_points || 0}</span>
        </div>
      </div>
    </div>
  );
}
