import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";
import { useMountSeed } from "@/hooks/useMountSeed";
import { seededShuffle } from "@/utils/seededShuffle";
import type { GameChoice } from "@/components/team/CreateRoomPage";

import playersIcon from "@/assets/play-chooser/players.svg";
import { GAME_MODE_META } from "@/config/gameModeMeta";
import featuredQuick from "@/assets/play-chooser/featured-quick.webp";
import featuredLibrary from "@/assets/play-chooser/featured-library.webp";
import featuredGuess from "@/assets/play-chooser/featured-random.webp";
import featuredKing from "@/assets/play-chooser/featured-king.webp";
import featuredBattle from "@/assets/play-chooser/featured-battle.webp";
import featuredWords from "@/assets/play-chooser/featured-words.webp";
import featuredMyTrivias from "@/assets/play-chooser/featured-mytrivias.webp";
import { useCategories } from "@/hooks/useCategories";
import { useVipStatus } from "@/hooks/useVipStatus";
import { AirbnbCategoryCard } from "@/components/discover/AirbnbCategoryCard";
import { ProBannerReel } from "@/components/shop/MobileProCarousel";

/**
 * The feature rails revealed BELOW the home hero when the player scrolls
 * (owner's ask): a light, chunky feed — active rooms, play modes,
 * categories and the day's deals — each a horizontally-scrolling strip
 * under a title and a two-or-three-word line.
 *
 * It renders only the rails: the hero above it (mascot scene, friends reel,
 * profile card) and the scroller both live in MobileHomeScroll. Reordering
 * the home is moving a block here, not rewiring it.
 */

// The reel marks bought deals; the home doesn't buy from the rail itself.
const EMPTY_PURCHASES: Set<string> = new Set();

const PICTURE_GUESS = POPULAR_IMAGE_CATEGORY_IDS as readonly string[];

/**
 * Deal `count` categories, mixed. The catalogue leads with the six
 * picture-guess categories, so "the first twelve" was a wall of "Guess the…"
 * cards. Shuffle on the seed, then deal round-robin across groups — the
 * picture-guess six as one group, everything else by type — so no two alike
 * sit side by side when it can be helped.
 */
function dealMixed<T extends { id: string; category_id?: string; type?: string }>(
  list: T[],
  seed: number,
  count: number,
): T[] {
  const shuffled = seededShuffle(list, seed);
  const groups = new Map<string, T[]>();
  for (const c of shuffled) {
    const key = PICTURE_GUESS.includes(c.category_id ?? c.id) ? "guess" : (c.type ?? "other");
    let q = groups.get(key);
    if (!q) groups.set(key, (q = []));
    q.push(c);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  while (out.length < count && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      if (out.length >= count) break;
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

/** A rail's title, with an optional "see all". */
function RailHeader({
  title,
  action,
}: {
  title: string;
  /**
   * `kind: "add"` turns the link into a round +.
   *
   * "See all trivias" is a promise the rail cannot keep when there are none
   * — it leads to an empty list. With nothing to see, the only useful thing
   * in that corner is the way to make the first one.
   */
  action?: { label: string; onPress: () => void; kind?: "link" | "add" };
}) {
  return (
    // Figma 1076:2113: the display face at 26px in the deep aubergine, on a
    // 29px row with the link centred against it; the rail follows 20px
    // below. The frame's rails carry no line under the title.
    <div className="mb-5 flex min-h-[29px] items-center justify-between gap-2 px-4">
      {/* 34px of line, not 22.5.
          `truncate` sets overflow:hidden, so the line box IS the clip box —
          and at 26px the frame's 22.5px leading is shorter than the type.
          Latin survives that; Georgian does not, because ჟ, ე, ი and friends
          hang below the baseline, and "ოთახები" came out sliced along the
          bottom. The row grows instead of being pinned to 29px. */}
      <h2 className="min-w-0 truncate font-display font-bold text-[26px] leading-[34px] tracking-[-0.16px] text-[#552d7a]">
        {title}
      </h2>
      {action && (action.kind === "add" ? (
        <button
          type="button"
          onClick={action.onPress}
          aria-label={action.label}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#7126d5] text-white shadow-[0_4px_10px_rgba(113,38,213,0.28)] active:scale-95"
        >
          <Plus className="h-5 w-5" strokeWidth={2.75} />
        </button>
      ) : (
        <button
          type="button"
          onClick={action.onPress}
          className="flex shrink-0 items-center gap-0.5 font-[Nunito] text-[13px] font-bold text-[#7126d5]"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

/** The scroller every card rail shares — full-width, 16px inset, snaps. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1 scrollbar-hide">
      {children}
    </div>
  );
}

export function MobileHomeFeed() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { developerMode } = useDeveloperMode();

  // The play chooser's own cards — same art, same order, same gating (King
  // and Battle are developer-only until promoted) — at a compact size. A tap
  // opens the chooser with that mode already started, as tapping the card
  // there would.
  // The head count each card wears comes from GAME_MODE_META, the same table
  // the chooser's cards read: this rail and that shelf print the same numbers,
  // and two hand-written lists is how they stopped doing so once already.
  const playCards: { key: GameChoice; art: string; title: string }[] = [
    { key: "quick", art: featuredQuick, title: t("extra.modeQuickTitle") },
    { key: "library", art: featuredLibrary, title: t("extra.modeLibraryTitle") },
    // Guess is played alone (owner) — one picture game, one player.
    { key: "guess", art: featuredGuess, title: t("extra.modeGuessTitle") },
    ...(developerMode
      ? [
          { key: "king" as const, art: featuredKing, title: t("extra.modeKingTitle") },
          { key: "battle" as const, art: featuredBattle, title: t("extra.modeBattleTitle") },
        ]
      : []),
    { key: "words", art: featuredWords, title: t("gameTypes.wordsTitle") },
    { key: "mytrivias", art: featuredMyTrivias, title: t("extra.myTriviaOption") },
  ];
  const { categories } = useCategories();
  const { isVip } = useVipStatus();

  // A dozen categories, mixed, dealt fresh on every visit: the seed is fixed
  // for this mount (random per refresh, stable while you browse — the cards
  // must not reshuffle under a finger when the list re-renders).
  const seed = useMountSeed();
  const railCategories = useMemo(() => dealMixed(categories, seed, 12), [categories, seed]);

  // MyRoomsSection owns the rooms query; the header above it needs only the
  // count, to know whether "see all" has anything to show. Reported up
  // rather than fetched twice.
  const [roomsEmpty, setRoomsEmpty] = useState(false);

  return (
    <div className="flex flex-col gap-6 pt-5">
      {/* ── Rooms ─────────────────────────────────────────────────────── */}
      <section>
        <RailHeader
          title={t("extra.railRooms")}
          action={
            roomsEmpty
              ? { label: t("extra.railFirstRoom"), onPress: () => navigate("/create-room"), kind: "add" }
              : { label: t("extra.viewAllRooms"), onPress: () => navigate("/team") }
          }
        />
        {/* MyRoomsSection brings its own full-width px-4 scroller. */}
        <MyRoomsSection
          vertical={false}
          homeRail
          filter="all"
          onCreateRoom={() => navigate("/create-room")}
          onShowAllRooms={() => navigate("/team")}
          onEmptyChange={setRoomsEmpty}
        />
      </section>

      {/* ── Play modes (Figma 1076:2455) ────────────────────────────────
          The chooser's poster card, simplified: the render fills the whole
          221×291 card, a lavender wash climbs the lower two fifths, the
          peach players pill sits top right and one line names the mode at
          the foot. The still stands in for the chooser's looping video: a
          rail of loops is a rail of decoders. */}
      <section>
        <RailHeader title={t("extra.railPlay")} />
        <Rail>
          {playCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(`/create-room?mode=${card.key}`)}
              className="relative isolate block h-[291.3px] w-[221.3px] shrink-0 snap-start overflow-clip rounded-[27.1px] bg-[#e9d8ff] text-left transition-transform active:scale-[0.97]"
            >
              <img
                alt=""
                src={card.art}
                draggable={false}
                loading="lazy"
                className="absolute inset-x-0 top-[-1px] z-0 h-[295px] w-full object-cover object-top"
              />
              {/* The lavender wash over the lower 41.5%, solid for its lower half. */}
              <div className="absolute inset-x-0 bottom-0 z-10 h-[41.5%] bg-[linear-gradient(to_top,#f3e6ff_0%,#f3e6ff_50%,rgba(243,230,255,0)_100%)]" />
              {/* How many play: the peach pill, top right. */}
              {GAME_MODE_META[card.key].players && (
                <div className="absolute right-[8px] top-[8px] z-20 flex items-center gap-[4.5px] rounded-[15.8px] border-[2.26px] border-solid border-white/65 bg-gradient-to-b from-[#fff3ed] to-[#f5cdcd] px-[10.2px] py-[1.1px] shadow-[0px_2.26px_6.78px_0px_rgba(151,64,64,0.06),0px_2.26px_0px_0px_#d6c7c4]">
                  <img alt="" src={playersIcon} className="h-[14.7px] w-[11.3px]" />
                  <span className="whitespace-nowrap bg-gradient-to-b from-[#522b28] to-[#99665f] bg-clip-text font-hero text-[14.7px] capitalize leading-[22.6px] tracking-[-0.18px] text-transparent">
                    {GAME_MODE_META[card.key].players}
                  </span>
                </div>
              )}
              {/* The mode's name, one line at the foot (Figma 1076:3714). */}
              <p className="absolute left-[23px] right-[18px] top-[248px] z-20 truncate font-display font-bold text-[16px] leading-[22.5px] tracking-[-0.16px] text-[#552d7a]">
                {card.title}
              </p>
            </button>
          ))}
        </Rail>
      </section>

      {/* ── Categories (the airbnb-style chunky cards) ────────────────── */}
      {railCategories.length > 0 && (
        <section>
          <RailHeader
            title={t("extra.railCategories")}
            action={{ label: t("extra.seeAll"), onPress: () => navigate("/discover") }}
          />
          <Rail>
            {railCategories.map((cat) => (
              // The room card's width (MyRoomsSection's home rail, 280px), so
              // the two rails' cards line up one above the other (owner's
              // ask). A card and the edge of the next on a phone, so the
              // rail still plainly scrolls.
              <div key={cat.id} className="w-[280px] shrink-0 snap-start">
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

      {/* ── PRO — the full-card, arrowed reel ────────────────────────────
          The two subscription tiers close the feed (owner's ask). It used
          to be the timed packages: a countdown at the bottom of the home
          page is an offer the player meets on their way out, and the thing
          worth showing them there is the tier, which does not expire.

          The packages are still sold — they are at the foot of the shop,
          under the powers, where somebody already spending is reading. */}
      <section>
        <RailHeader title={t("extra.railPro")} />
        <ProBannerReel
          slides="pro"
          purchasedItems={EMPTY_PURCHASES}
          isPurchasing={null}
          onItemClick={() => navigate("/power-ups")}
        />
      </section>
    </div>
  );
}

export default MobileHomeFeed;
