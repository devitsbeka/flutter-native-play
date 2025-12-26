import { VideoAdventureMap } from "@/components/map/VideoAdventureMap";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

export default function AdventureMap() {
  return (
    <div className="min-h-screen relative">
      <VideoAdventureMap />
      <UniversalBottomNav />
    </div>
  );
}
