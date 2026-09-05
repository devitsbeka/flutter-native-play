import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MobileSceneBackground, MobileMascotScene, MobileProfileCard } from "@/components/home/MobileHome";
import { MobileHomeFeed } from "@/components/home/MobileHomeFeed";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";

/**
 * The phone home as a scroll-reveal (owner's ask).
 *
 * At rest it IS the old home: the mascot scene fills the screen, the friends
 * reel rides the top, the profile card sits above the nav — nothing moved.
 *
 * Scrolling lifts that hero out of view and reveals a light, chunky feed of
 * feature rails beneath it. Once the scene is gone a compact header — the
 * player's face, name and balances — fades in and stays, so the identity the
 * scene used to carry is still there while you browse.
 *
 * It owns its own vertical scroller: nativeShell kills the webview's document
 * scroller on iOS (CLAUDE.md rule 4b), so the feed is a fixed-height
 * `overflow-y-auto` box, not content that merely grows.
 */

export interface MobileHomeScrollProps {
  // Scene
  sceneUrl: string | null;
  showDefaultScene: boolean;
  defaultSceneVideo: string;
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
  sceneUrl,
  showDefaultScene,
  defaultSceneVideo,
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
  // Fades the compact header in and the scroll hint out once the hero has
  // begun to leave — a small threshold so it reacts to intent, not just to
  // reaching the feed.
  const [scrolled, setScrolled] = useState(false);
  const ticking = useRef(false);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      setScrolled(top > 72);
      ticking.current = false;
    });
  };

  return (
    <div className="relative min-h-0 flex-1">
      {/* Compact identity + balances, fading in once the scene has gone. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-white/50 bg-[rgba(250,246,255,0.86)] px-4 py-2 backdrop-blur-xl transition-opacity duration-200 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: scrolled ? "auto" : "none" }}
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
        {/* ── Hero: the old home, one screenful, scrolls away ─────────── */}
        <section className="relative h-full">
          {sceneUrl ? (
            <MobileMascotScene sceneUrl={sceneUrl} />
          ) : showDefaultScene ? (
            <MobileSceneBackground defaultVideoSrc={defaultSceneVideo} />
          ) : null}

          {/* Friends reel, riding the top of the hero as it always did. */}
          <div className="relative z-20 px-4 pt-2">
            <FriendsStoriesBar onAddFriendClick={onAddFriend} />
          </div>

          {/* The profile card, anchored above the nav. */}
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

          {/* The cue that there is a feed below — a soft pill that bounces,
              and stands down the moment the scroll starts. */}
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-[calc(88px_+_var(--safe-bottom)_+_78px)] z-20 flex justify-center transition-opacity duration-200 ${
              scrolled ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="flex size-9 animate-bounce items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-[0_2px_8px_rgba(60,30,90,0.18)] backdrop-blur">
              <ChevronDown className="h-5 w-5 text-[#7126d5]" />
            </span>
          </div>
        </section>

        {/* ── Feed: light, chunky rails revealed on scroll ────────────── */}
        <div className="relative z-10 rounded-t-[28px] bg-[#faf6ff] pb-[calc(104px_+_var(--safe-bottom))] shadow-[0_-10px_28px_rgba(60,30,90,0.12)]">
          <div className="mx-auto flex justify-center pt-2">
            <span className="h-[5px] w-[44px] rounded-full bg-[rgba(90,60,130,0.22)]" />
          </div>
          <MobileHomeFeed />
        </div>
      </div>
    </div>
  );
}

export default MobileHomeScroll;
