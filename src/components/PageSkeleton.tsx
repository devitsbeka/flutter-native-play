export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      {/* Minimal spinner instead of jarring skeleton */}
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
