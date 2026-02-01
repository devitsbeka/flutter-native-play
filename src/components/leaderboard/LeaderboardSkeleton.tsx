import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardRowSkeleton({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-b-0">
      {/* Avatar skeleton */}
      <div className="relative shrink-0">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full" />
      </div>

      {/* Name skeleton */}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Coins skeleton */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

export function LeaderboardCardSkeleton({ isUserTier = false }: { isUserTier?: boolean }) {
  return (
    <Card className={`backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl ${
      isUserTier ? 'bg-white/50 border-primary/50 ring-2 ring-primary/20' : 'bg-card/50 border-border/30'
    }`}>
      <CardHeader className="py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent text-center">
        <Skeleton className="h-5 w-32 mx-auto" />
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} index={i} />
        ))}
      </CardContent>
    </Card>
  );
}

export function MobileLeaderboardSkeleton() {
  return (
    <div className="pt-[calc(35vh-30px)] md:pt-[calc(60vh-130px)] px-4">
      <LeaderboardCardSkeleton isUserTier />
    </div>
  );
}

export function DesktopLeaderboardsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-6">
        <LeaderboardCardSkeleton />
        <LeaderboardCardSkeleton isUserTier />
        <LeaderboardCardSkeleton />
      </div>
    </div>
  );
}
