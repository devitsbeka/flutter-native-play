import { useRef, useState, type ReactNode } from "react";

import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MobileProfileCard } from "@/components/home/MobileHome";
import { MobileHomeFeed } from "@/components/home/MobileHomeFeed";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";

/**
 * The phone home as a scroll-reveal (owner's ask).
 *
 * At rest it IS the old home: the mascot scene fills the first screen, the
 * friends reel rides the top, the profile card sits above the nav — nothing
 * moved. Scrolling lifts that whole hero — scene included — up and out of
 * view, revealing a light, chunky feed of feature rails beneath it. Once the
 * hero is gone a compact header — the player's face, name and balances —
 * fades in and stays, so the identity the scene used to carry is still there
 * while you browse.
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

// Scroll past this and the compact identity header is shown.
const HEADER_AT_PX = 72;

export interface MobileHomeScrollProps {
  /**
   * The mascot scene (or the default Trivia King loop), rendered inside the
   * hero so it scrolls away with it. The scene components are `absolute
   * inset-0`, so they fill the hero — one full screen at rest.
   */
  scene: ReactNode;
  // Identity
  nickname: string;
  avatarUrl: string | null;
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
  onAvatar: () => void;
  onShop: () => void;
  onAddFriend: () => void;
}

export function MobileHomeScroll({
  scene,
  nickname,
  avatarUrl,
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
  onAvatar,
  onShop,
  onAddFriend,
}: MobileHomeScrollProps) {
  const [scrolled, setScrolled] = useState(false);
  const ticking = useRef(false);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      setScrolled(top > HEADER_AT_PX);
      ticking.current = false;
    });
  };

  return (
    // The scroller is `absolute inset-0` of this positioned, flex-filled root
    // rather than `h-full`, so it takes a real pixel height from the root and
    // the hero's `h-full` resolves to exactly one screen.
    <div className="relative z-10 min-h-0 flex-1">
      {/* Compact identity + balances, fading in once the hero has gone. */}
      <div
        className={`absolute inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-white/50 bg-[rgba(250,246,255,0.86)] px-4 py-2 backdrop-blur-xl transition-opacity duration-200 ${
          scrolled ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button type="button" onClick={onAvatar} className="shrink-0">
          <img
            alt=""
            src={resolveAvatarUrl(avatarUrl) ?? fallbackAvatarFor(nickname)}
            className="size-[36px] rounded-full border-2 border-white object-cover"
          />
        </button>
        <p className="min-w-0 flex-1 truncate font-hero text-[17px] leading-[20px] text-[#402666]">
          {nickname}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onShop}
            className="flex h-[30px] items-center gap-1 rounded-full border-[1.5px] border-[#ffd98a] bg-[#fff8e8] px-[9px]"
          >
            <img alt="" src={coinNew} className="size-[15px] object-contain" />
            <span className="font-[Nunito] text-[12px] font-extrabold text-[#b9761a]">
              {coins.toLocaleString("en-US")}
            </span>
          </button>
          <button
            type="button"
            onClick={onShop}
            className="flex h-[30px] items-center gap-1 rounded-full border-[1.5px] border-[#c9b0f5] bg-[#f6f0ff] px-[9px]"
          >
            <img alt="" src={gemNew} className="size-[15px] object-contain" />
            <span className="font-[Nunito] text-[12px] font-extrabold text-[#7b3fc4]">
              {gems.toLocaleString("en-US")}
            </span>
          </button>
        </div>
      </div>

      <div className="absolute inset-0 overflow-y-auto overscroll-contain" onScroll={onScroll}>
        {/* ── Hero: exactly one screenful, scrolls away as a whole ─────────
            The scene fills it (absolute inset-0 behind the reel and card),
            so at rest it is pixel-for-pixel the old home, and the feed waits
            entirely below the fold. `overflow-hidden` keeps the scene's
            oversized default-loop frame from widening the scroller. */}
        <section className="relative h-full overflow-hidden">
          {scene}

          {/* Friends reel, riding the top of the hero as it always did. */}
          <div className="relative z-20 px-4 lg:pl-[26px]">
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
            that) and the feed lands as solid ground rather than trailing off. */}
        <div className="relative z-10 min-h-full rounded-t-[28px] bg-[#faf6ff] pb-[calc(104px_+_var(--safe-bottom))] shadow-[0_-10px_28px_rgba(60,30,90,0.14)]">
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
