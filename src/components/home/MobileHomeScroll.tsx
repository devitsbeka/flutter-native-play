import type { ReactNode } from "react";

import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MobileProfileCard, NAV_CHROME } from "@/components/home/MobileHome";
import { MobileHomeFeed } from "@/components/home/MobileHomeFeed";

/**
 * The phone home as a scroll-reveal (owner's ask).
 *
 * At rest it IS the old home: the mascot scene fills the first screen, the
 * friends reel rides the top, the profile card sits above the nav — nothing
 * moved. Scrolling lifts that whole hero — scene included — up and out of
 * view, revealing a light, chunky feed of feature rails beneath it. The
 * identity stays exactly where it always was, on the profile card; there is
 * deliberately no second name/balances bar.
 *
 * The scene lives INSIDE the hero, in the scroll flow, on purpose. It used to
 * be a page-level fixed backdrop that the feed panel had to paint over, and
 * on iOS that never worked: the scene's <video> is promoted to its own
 * compositing layer and painted above the feed regardless of z-index, so the
 * mascot punched through the lower half of the feed. A scene that scrolls
 * away with the hero is simply off-screen once the feed is up — there is
 * nothing left to composite over it.
 *
 * It owns its own vertical scroller (CLAUDE.md rule 4b).
 */

export interface MobileHomeScrollProps {
  /**
   * The mascot scene (or the default Trivia King loop), rendered inside the
   * hero so it scrolls away with it. The scene components are `absolute
   * inset-0`, so they fill the hero — one full screen at rest.
   */
  scene: ReactNode;
  // Identity, for the profile card
  nickname: string;
  countryCode?: string | null;
  rank?: number | null;
  coins: number;
  gems: number;
  // Handlers
  onNameClick: () => void;
  onRankClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  onGiftClick: () => void;
  onStreakClick: () => void;
  onAddFriend: () => void;
}

export function MobileHomeScroll({
  scene,
  nickname,
  countryCode,
  rank,
  coins,
  gems,
  onNameClick,
  onRankClick,
  onCoinsClick,
  onGemsClick,
  onGiftClick,
  onStreakClick,
  onAddFriend,
}: MobileHomeScrollProps) {
  return (
    // The scroller is `absolute inset-0` of this positioned, flex-filled root
    // rather than `h-full`, so it takes a real pixel height from the root and
    // the hero's `h-full` resolves to exactly one screen. This root must be
    // the ONLY flex-1 child of the home column: a sibling flex-1 splits the
    // height with it and turns the home into a half-screen window.
    <div className="relative z-10 min-h-0 flex-1">
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        {/* ── Hero: exactly one screenful, scrolls away as a whole ─────────
            The scene fills it (absolute inset-0 behind the reel and card),
            so at rest it is pixel-for-pixel the old home, and the feed waits
            entirely below the fold. `overflow-hidden` keeps the scene's
            oversized default-loop frame from widening the scroller. */}
        <section className="relative h-full overflow-hidden">
          {scene}

          {/* Friends reel, riding the top of the hero as it always did — padded
              down by the floating header's measured height so it sits below
              it rather than underneath it. */}
          <div className="relative z-20 px-4 pt-[var(--home-header-h,64px)] lg:pl-[26px]">
            <FriendsStoriesBar onAddFriendClick={onAddFriend} />
          </div>

          {/* The profile card, anchored above the nav (its own absolute pos). */}
          <MobileProfileCard
            nickname={nickname}
            countryCode={countryCode}
            rank={rank}
            coins={coins}
            gems={gems}
            onNameClick={onNameClick}
            onRankClick={onRankClick}
            onCoinsClick={onCoinsClick}
            onGemsClick={onGemsClick}
            onGiftClick={onGiftClick}
            onStreakClick={onStreakClick}
          />
        </section>

        {/* ── Feed: light, chunky rails revealed on scroll ──────────────────
            `min-h-full` — at least one scroller viewport — so the hero can
            scroll fully off (the feed has to be at least a screen tall for
            that) and the feed lands as solid ground rather than trailing off.

            Pulled up by NAV_CHROME: the profile card anchors above the nav,
            so the hero keeps a nav-height strip below the card. At rest that
            strip is under the nav; scrolled, it rose into view as a dead band
            between the card and the feed. Starting the feed exactly at the
            nav's top edge hides its lip under the nav at rest and closes the
            band on scroll (z-10 over the scene's z-[4]; the card's z-20 stays
            above both). The bottom clearance reaches past the back-to-top
            chevron, which sits 36px above the nav on top of the play button
            — the reel's dots and Purchase button used to end up behind it. */}
        <div
          className="relative z-10 min-h-full rounded-t-[28px] bg-[#faf6ff] shadow-[0_-10px_28px_rgba(60,30,90,0.14)]"
          style={{ marginTop: `calc(-1 * (${NAV_CHROME}))`, paddingBottom: `calc(${NAV_CHROME} + 92px)` }}
        >
          <div className="flex justify-center pt-2">
            <span className="h-[5px] w-[44px] rounded-full bg-[rgba(90,60,130,0.22)]" />
          </div>
          <MobileHomeFeed />
        </div>
      </div>
    </div>
  );
}

export default MobileHomeScroll;
