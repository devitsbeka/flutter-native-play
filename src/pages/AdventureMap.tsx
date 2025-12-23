import { SeasonalAdventureMap } from "@/components/map/SeasonalAdventureMap";
import { QuickActionsBar } from "@/components/home/QuickActionsBar";

export default function AdventureMap() {
  return (
    <div className="min-h-screen relative">
      <SeasonalAdventureMap />
      {/* Fixed bottom Quick Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background/90 to-transparent pt-4">
        <QuickActionsBar />
      </div>
    </div>
  );
}
