import { IslandAdventureMap } from "@/components/map/IslandAdventureMap";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

export default function AdventureMap() {
  return (
    <div className="min-h-screen relative">
      <IslandAdventureMap />
      <UniversalBottomNav />
    </div>
  );
}
