import { useRef, useState, type RefObject } from "react";

import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MobileProfileCard } from "@/components/home/MobileHome";
import { MobileHomeFeed } from "@/components/home/MobileHomeFeed";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";

/**
 * The phone home as a scroll-reveal (owner's ask).
 *
 * At rest it IS the old home: the mascot scene fills the screen (rendered at
 * the page level so it is never cropped), the friends reel rides the top, the
 * profile card sits above the nav — nothing moved.
 *
 * Scrolling fades the scene out and lifts the hero content away, revealing a
 * light, chunky feed of feature rails whose panel peeks a little at rest as a
 * cue. Once the scene is gone a compact header — the player's face, name and
 * balances — fades in and stays, so the identity the scene used to carry is
 * still there while you browse.
 *
 * The scene lives in Index (behind the header) and is faded through
 * `sceneFadeRef` so this scroller never has to reproduce its full-bleed
 * geometry. It owns its own vertical scroller (CLAUDE.md rule 4b).
 */

// Pixels of scroll over which the scene fades fully out.
const SCENE_FADE_PX = 240;
// Scroll past this and the compact identity header is shown.
const HEADER_AT_PX = 72;

export interface MobileHomeScrollProps {
  /** The page-level scene wrapper this scroller fades as the hero leaves. */
  sceneFadeRef: RefObject<HTMLDivElement>;
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
  sceneFadeRef,
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
      // Fade the page-level scene straight off the scroll — no React re-render.
      const scene = sceneFadeRef.current;
      if (scene) scene.style.opacity = String(Math.max(0, 1 - top / SCENE_FADE_PX));
      setScrolled(top > HEADER_AT_PX);
      ticking.current = false;
    });
  };

  return (
    <div className="relative z-10 min-h-0 flex-1">
      {/* Compact identity + balances, fading in once the scene has gone. */}
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

      <div className="h-full overflow-y-auto overscroll-contain" onScroll={onScroll}>
        {/* ── Hero: transparent over the page-level scene, scrolls away ──
            Exactly one screenful, so at rest it is pixel-for-pixel the old
            home: the scene shows through, the reel sits at the top and the
            card above the nav, and the feed waits entirely below the fold —
            nothing of it is seen until the scroll starts. */}
        <section className="relative h-full">
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
            min-h-[100dvh]: the feed is the solid ground the scroll lands on.
            The scene behind it is a FIXED, full-screen backdrop (page-level
            `absolute inset-0`), so the feed's opaque panel has to cover the
            whole viewport once you scroll into it — otherwise, when the rails
            are shorter than a screen, the fixed scene shows through beneath
            them and you get a scene stuck in the lower half. Guaranteeing at
            least a screenful of panel means the scene only ever shows behind
            the transparent hero (the intended at-rest look), never below the
            feed. */}
        <div className="relative z-10 min-h-[100dvh] rounded-t-[28px] bg-[#faf6ff] pb-[calc(104px_+_var(--safe-bottom))] shadow-[0_-10px_28px_rgba(60,30,90,0.14)]">
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
