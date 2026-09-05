import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Tv, Swords, Crown, SpellCheck, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { useGameTypes } from "@/hooks/useGameTypes";
import { ProBannerReel } from "@/components/shop/MobileProCarousel";
import { useLiveDeals, DealBannerCard } from "@/components/shop/DailyDealsRow";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

import coinNew from "@/assets/figma-home/coin-new.png";
import gemNew from "@/assets/figma-home/gem-new.png";

/**
 * The scrollable phone home (owner's ask): a compact mascot + identity strip
 * up top, the friends reel first, then a stack of horizontally-scrolling
 * feature rails — Rooms, Play modes, My Trivias, Pro, Daily offers — over a
 * floating-blob video wash.
 *
 * It OWNS its own vertical scroller. nativeShell disables the webview's
 * document scroller on iOS (CLAUDE.md rule 4b), so the feed is a fixed-height
 * `overflow-y-auto` box rather than content that just grows.
 *
 * The rails are deliberately independent blocks in one column: reordering the
 * home is moving a block, not rewiring it (the owner drives the order).
 */

const MODE_ICONS: Record<string, LucideIcon> = {
  users: Users,
  tv: Tv,
  swords: Swords,
  crown: Crown,
  "spell-check": SpellCheck,
};

// The reel marks bought deals; the home doesn't buy from the rail itself.
const EMPTY_PURCHASES: Set<string> = new Set();

// The home's horizontal padding, matched to the header and friends reel.
const EDGE = "px-4";

interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string | null;
}

export interface MobileHomeFeedProps {
  nickname: string;
  avatarUrl: string | null;
  coins: number;
  gems: number;
  onAvatar: () => void;
  onShop: () => void;
  onAddFriend: () => void;
}

/** A rail's title and its two-or-three-word line, with an optional "see all". */
function RailHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div className={`mb-[10px] flex items-end justify-between gap-2 ${EDGE}`}>
      <div className="min-w-0">
        <h2 className="font-hero text-[19px] capitalize leading-[22px] tracking-[-0.16px] text-[#402666]">
          {title}
        </h2>
        <p className="mt-[2px] font-[Nunito] text-[12px] font-medium leading-[15px] tracking-[-0.16px] text-[#6b5b86]">
          {desc}
        </p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="flex shrink-0 items-center gap-0.5 font-[Nunito] text-[13px] font-bold text-[#7126d5]"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** The scroller every card rail shares — full-width, 16px inset, snaps.
 *  (No negative margin: the section around it has no padding to cancel, so
 *  `-mx-4` would push the row 32px past the viewport and scroll the page.) */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-hide">
      {children}
    </div>
  );
}

export function MobileHomeFeed({
  nickname,
  avatarUrl,
  coins,
  gems,
  onAvatar,
  onShop,
  onAddFriend,
}: MobileHomeFeedProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const gameTypes = useGameTypes();
  const { dailyDeal, hourlyDeal, dailyRemaining, hourlyRemaining } = useLiveDeals();

  const { data: trivias = [] } = useQuery({
    queryKey: ["home-feed-my-trivias", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, cover_gradient")
        .eq("user_id", user!.id)
        .is("collection_id", null)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as Trivia[];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="relative min-h-0 flex-1">
      {/* The floating-blob loop as the page's wash, behind the whole feed. */}
      <video
        className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-90"
        autoPlay
        muted
        loop
        playsInline
        poster="/videos/floating-blob-still.jpg"
      >
        <source src="/videos/floating-blob.webm" type="video/webm" />
        <source src="/videos/floating-blob.mp4" type="video/mp4" />
      </video>

      <div className="h-full overflow-y-auto overscroll-contain pb-[calc(104px_+_var(--safe-bottom))]">
        {/* ── Mascot + identity, up top (owner's ask) ─────────────────── */}
        <div className={`flex items-center gap-3 pt-2 ${EDGE}`}>
          <button type="button" onClick={onAvatar} className="relative shrink-0">
            <img
              alt=""
              src={resolveAvatarUrl(avatarUrl) ?? fallbackAvatarFor(nickname)}
              className="size-[52px] rounded-full border-[3px] border-white object-cover shadow-[0_4px_10px_rgba(88,50,160,0.18)]"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-hero text-[20px] leading-[24px] text-[#402666]">
              {nickname}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onShop}
              className="flex h-[32px] items-center gap-1 rounded-full border-[1.5px] border-[#ffd98a] bg-[#fff8e8] px-[9px]"
            >
              <img alt="" src={coinNew} className="size-[16px] object-contain" />
              <span className="font-[Nunito] text-[13px] font-extrabold text-[#b9761a]">
                {coins.toLocaleString("en-US")}
              </span>
            </button>
            <button
              type="button"
              onClick={onShop}
              className="flex h-[32px] items-center gap-1 rounded-full border-[1.5px] border-[#c9b0f5] bg-[#f6f0ff] px-[9px]"
            >
              <img alt="" src={gemNew} className="size-[16px] object-contain" />
              <span className="font-[Nunito] text-[13px] font-extrabold text-[#7b3fc4]">
                {gems.toLocaleString("en-US")}
              </span>
            </button>
          </div>
        </div>

        {/* Mascot loop — small, riding the top rather than owning the screen. */}
        <div className="mt-1 flex justify-center">
          <video
            className="h-[128px] w-auto object-contain"
            autoPlay
            muted
            loop
            playsInline
            poster="/videos/floating-blob-still.jpg"
          >
            <source src="/videos/trivia-king-scene.mp4" type="video/mp4" />
          </video>
        </div>

        {/* ── Friends reel, first (owner's ask) ───────────────────────── */}
        <div className={`relative z-10 mt-1 ${EDGE}`}>
          <FriendsStoriesBar onAddFriendClick={onAddFriend} />
        </div>

        {/* ── Rooms ───────────────────────────────────────────────────── */}
        <section className="mt-5">
          <RailHeader
            title={t("extra.railRooms")}
            desc={t("extra.railRoomsDesc")}
            action={{ label: t("extra.viewAllRooms"), onPress: () => navigate("/team") }}
          />
          {/* MyRoomsSection brings its own full-width px-4 scroller. */}
          <MyRoomsSection
            vertical={false}
            filter="all"
            onCreateRoom={() => navigate("/create-room")}
            onShowAllRooms={() => navigate("/team")}
          />
        </section>

        {/* ── Play modes ──────────────────────────────────────────────── */}
        <section className="mt-6">
          <RailHeader title={t("extra.railPlay")} desc={t("extra.railPlayDesc")} />
          <Rail>
            {gameTypes.map((gt) => {
              const Icon = MODE_ICONS[gt.icon] ?? Users;
              return (
                <button
                  key={gt.key}
                  type="button"
                  onClick={() => gt.launch?.(navigate)}
                  className="relative flex h-[132px] w-[150px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[22px] p-3 text-left"
                  style={{ background: gt.tileBg, boxShadow: gt.tileShadow }}
                >
                  <Icon className="absolute right-3 top-3 h-6 w-6 text-white/85" strokeWidth={2.2} />
                  <p className="font-hero text-[16px] capitalize leading-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                    {t(gt.titleKey)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 font-[Nunito] text-[11px] font-semibold leading-[14px] text-white/85">
                    {t(gt.descKey)}
                  </p>
                </button>
              );
            })}
          </Rail>
        </section>

        {/* ── My Trivias (newest first, from the left) ────────────────── */}
        {trivias.length > 0 && (
          <section className="mt-6">
            <RailHeader
              title={t("extra.railMyTrivias")}
              desc={t("extra.railMyTriviasDesc")}
              action={{ label: t("extra.allTriviasBtn"), onPress: () => navigate("/team") }}
            />
            <Rail>
              {trivias.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => navigate(`/trivia/${tr.id}`)}
                  className="flex w-[132px] shrink-0 snap-start flex-col gap-2 text-left"
                >
                  <div
                    className="h-[132px] w-full rounded-[18px] border-2 border-white bg-cover bg-center shadow-[0_4px_10px_rgba(88,50,160,0.16)]"
                    style={{
                      background: tr.cover_image
                        ? `url(${tr.cover_image}) center/cover`
                        : tr.cover_gradient || "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)",
                    }}
                  />
                  <p className="line-clamp-2 px-0.5 font-[Nunito] text-[13px] font-bold leading-[16px] text-[#402666]">
                    {tr.title}
                  </p>
                </button>
              ))}
            </Rail>
          </section>
        )}

        {/* ── Pro (solo + friends) ────────────────────────────────────── */}
        <section className="mt-6">
          <RailHeader title={t("extra.railPro")} desc={t("extra.railProDesc")} />
          <ProBannerReel
            slides="pro"
            purchasedItems={EMPTY_PURCHASES}
            isPurchasing={null}
            onItemClick={() => navigate("/profile?tab=PRO")}
          />
        </section>

        {/* ── Daily offers ────────────────────────────────────────────── */}
        <section className="mt-6">
          <RailHeader title={t("extra.railOffers")} desc={t("extra.railOffersDesc")} />
          <Rail>
            <div className="w-[300px] shrink-0 snap-start">
              <DealBannerCard
                deal={dailyDeal}
                label={t("shop.dailyDeal")}
                remainingLabel={dailyRemaining}
                daily
                isPurchased={false}
                isLoading={false}
                onBuy={() => navigate("/power-ups")}
              />
            </div>
            <div className="w-[300px] shrink-0 snap-start">
              <DealBannerCard
                deal={hourlyDeal}
                label={t("shop.hourlyDeal")}
                remainingLabel={hourlyRemaining}
                daily={false}
                isPurchased={false}
                isLoading={false}
                onBuy={() => navigate("/power-ups")}
              />
            </div>
          </Rail>
        </section>
      </div>
    </div>
  );
}

export default MobileHomeFeed;
