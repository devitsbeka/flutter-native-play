import { DidYouKnowWidget } from "./widgets/DidYouKnowWidget";
import { TriviaPartyPromo } from "./widgets/TriviaPartyPromo";
import { LiveGamesWidget } from "./widgets/LiveGamesWidget";
import { ShopPromoWidget } from "./widgets/ShopPromoWidget";

export function DesktopSidebars() {
  return (
    <>
      {/* Left Sidebar - visible on lg+ */}
      <aside className="hidden lg:flex flex-col w-[280px] xl:w-[320px] min-w-[280px] xl:min-w-[320px] h-screen sticky top-0 p-4 pt-20 pb-24 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-4">
          <DidYouKnowWidget />
          <TriviaPartyPromo />
        </div>
      </aside>
      
      {/* Right Sidebar - visible on xl+ (hidden on tablet, shown on desktop) */}
      <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 p-4 pt-20 pb-24 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-4">
          <LiveGamesWidget />
          <ShopPromoWidget />
        </div>
      </aside>
    </>
  );
}

// Separate component for left sidebar only (tablet view)
export function DesktopLeftSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[280px] xl:w-[320px] min-w-[280px] xl:min-w-[320px] h-[calc(100vh-60px)] sticky top-0 p-4 pb-24 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col gap-4">
        <DidYouKnowWidget />
        <TriviaPartyPromo />
      </div>
    </aside>
  );
}

// Separate component for right sidebar only (desktop view)
export function DesktopRightSidebarWidgets() {
  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-[calc(100vh-60px)] sticky top-0 p-4 pt-28 pb-24 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col gap-4">
        <LiveGamesWidget />
        <ShopPromoWidget />
      </div>
    </aside>
  );
}
