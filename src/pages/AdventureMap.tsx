import { IslandAdventureMap } from "@/components/map/IslandAdventureMap";
import { QuickActionsBar } from "@/components/home/QuickActionsBar";

export default function AdventureMap() {
  return (
    <div className="min-h-screen relative">
      <IslandAdventureMap />
      {/* Fixed bottom Quick Actions */}
      <QuickActionsBar />
    </div>
  );
}
