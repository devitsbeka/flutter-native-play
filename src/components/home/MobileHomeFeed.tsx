import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Tv, Swords, Crown, SpellCheck, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { useGameTypes } from "@/hooks/useGameTypes";
import { useCategories } from "@/hooks/useCategories";
import { useVipStatus } from "@/hooks/useVipStatus";
import { AirbnbCategoryCard } from "@/components/discover/AirbnbCategoryCard";
import { ProBannerReel } from "@/components/shop/MobileProCarousel";
import { useLiveDeals, DealBannerCard } from "@/components/shop/DailyDealsRow";

/**
 * The feature rails revealed BELOW the home hero when the player scrolls
 * (owner's ask): a light, chunky feed — active rooms, play modes, the
 * player's trivias, Pro and the day's deals — each a horizontally-scrolling
 * strip under a title and a two-or-three-word line.
 *
 * It renders only the rails: the hero above it (mascot scene, friends reel,
 * profile card) and the scroller both live in MobileHomeScroll. Reordering
 * the home is moving a block here, not rewiring it.
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

interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string | null;
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
    <div className="mb-[10px] flex items-end justify-between gap-2 px-4">
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

/** The scroller every card rail shares — full-width, 16px inset, snaps. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-hide">
      {children}
    </div>
  );
}

export function MobileHomeFeed() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const gameTypes = useGameTypes();
  const { categories } = useCategories();
  const { isVip } = useVipStatus();
  const { dailyDeal, hourlyDeal, dailyRemaining, hourlyRemaining } = useLiveDeals();

  // The first dozen categories as a rail — the app's richest, always-present
  // "what to play" content, and what keeps the feed taller than a screen so
  // it fills rather than trailing off into an empty band.
  const railCategories = categories.slice(0, 12);

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
    <div className="flex flex-col gap-6 pt-5">
      {/* ── Rooms ─────────────────────────────────────────────────────── */}
      <section>
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

      {/* ── Play modes ────────────────────────────────────────────────── */}
      <section>
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

      {/* ── Categories (the airbnb-style chunky cards) ────────────────── */}
      {railCategories.length > 0 && (
        <section>
          <RailHeader
            title={t("extra.railCategories")}
            desc={t("extra.railCategoriesDesc")}
            action={{ label: t("extra.seeAll"), onPress: () => navigate("/discover") }}
          />
          <Rail>
            {railCategories.map((cat) => (
              <div key={cat.id} className="w-[158px] shrink-0 snap-start">
                <AirbnbCategoryCard
                  id={cat.id}
                  categoryId={cat.category_id || cat.id}
                  iconSlug={cat.icon_slug}
                  name={cat.name}
                  icon={cat.icon}
                  color={cat.color}
                  totalLevels={cat.totalLevels || 20}
                  imageUrl={cat.image_url ?? undefined}
                  isLocked={!isVip && cat.tier === "premium"}
                  onClick={() => navigate(`/category/${cat.id}`)}
                  variant="compact"
                />
              </div>
            ))}
          </Rail>
        </section>
      )}

      {/* ── My Trivias (newest first, from the left) ──────────────────── */}
      {trivias.length > 0 && (
        <section>
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

      {/* ── Pro (solo + friends) ──────────────────────────────────────── */}
      <section>
        <RailHeader title={t("extra.railPro")} desc={t("extra.railProDesc")} />
        <ProBannerReel
          slides="pro"
          purchasedItems={EMPTY_PURCHASES}
          isPurchasing={null}
          onItemClick={() => navigate("/profile?tab=PRO")}
        />
      </section>

      {/* ── Daily offers ──────────────────────────────────────────────── */}
      <section>
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
  );
}

export default MobileHomeFeed;
