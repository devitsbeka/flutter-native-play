import { DidYouKnowWidget } from "./widgets/DidYouKnowWidget";
import { TriviaPartyPromo } from "./widgets/TriviaPartyPromo";
import { LiveGamesWidget } from "./widgets/LiveGamesWidget";
import { ShopPromoWidget } from "./widgets/ShopPromoWidget";

export function DesktopSidebars() {
  return (
    <div className="hidden xl:flex absolute inset-0 z-[5] pointer-events-none">
      {/* Left Sidebar */}
      <div className="w-80 flex flex-col gap-3 p-4 pt-20 pb-24 pointer-events-auto">
        <DidYouKnowWidget />
        <TriviaPartyPromo />
      </div>
      
      {/* Center spacer */}
      <div className="flex-1" />
      
      {/* Right Sidebar */}
      <div className="w-80 flex flex-col gap-3 p-4 pt-20 pb-24 pointer-events-auto">
        <LiveGamesWidget />
        <ShopPromoWidget />
      </div>
    </div>
  );
}
