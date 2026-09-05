import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { MyRoomsSection } from "@/components/team/MyRoomsSection";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";
import type { GameChoice } from "@/components/team/CreateRoomPage";

import playersIcon from "@/assets/play-chooser/players.svg";
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
import { StartHereCard } from "@/components/home/StartHereCard";

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

// The reel marks bought deals; the home doesn't buy from the rail itself.
const EMPTY_PURCHASES: Set<string> = new Set();

const PICTURE_GUESS = POPULAR_IMAGE_CATEGORY_IDS as readonly string[];

/** mulberry32 — a tiny seeded PRNG, so one seed always deals one order. */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  const rand = seededRandom(seed);
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
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
    <div className="mb-[10px] flex items-end justify-between gap-2 px-4">
      <div className="min-w-0">
        <h2 className="font-hero text-[19px] capitalize leading-[22px] tracking-[-0.16px] text-[#402666]">
          {title}
        </h2>
        {/* Regular weight, lighter ink: it is a subtitle under a display
            face, and at medium it competed with the heading instead of
            sitting under it. */}
        <p className="mt-[2px] font-[Nunito] text-[12px] font-normal leading-[15px] tracking-[-0.16px] text-[#6b5b86]/85">
          {desc}
        </p>
      </div>
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
  const { user } = useAuth();
  const { developerMode } = useDeveloperMode();

  // The play chooser's own cards — same art, same order, same gating (King
  // and Battle are developer-only until promoted) — at a compact size. A tap
  // opens the chooser with that mode already started, as tapping the card
  // there would.
  const playCards: { key: GameChoice; art: string; players: string | null; title: string; desc: string }[] = [
    { key: "quick", art: featuredQuick, players: "1-10", title: t("extra.modeQuickTitle"), desc: t("extra.modeQuickDesc") },
    { key: "library", art: featuredLibrary, players: null, title: t("extra.modeLibraryTitle"), desc: t("extra.libraryDesc") },
    { key: "guess", art: featuredGuess, players: "1-10", title: t("extra.modeGuessTitle"), desc: t("extra.modeGuessDesc") },
    ...(developerMode
      ? [
          { key: "king" as const, art: featuredKing, players: "1-10", title: t("extra.modeKingTitle"), desc: t("lobby.kingCardDesc") },
          { key: "battle" as const, art: featuredBattle, players: "4-10", title: t("extra.modeBattleTitle"), desc: t("gameTypes.teamBattleDesc") },
        ]
      : []),
    { key: "words", art: featuredWords, players: "1-2", title: t("gameTypes.wordsTitle"), desc: t("extra.modeWordsDesc") },
    { key: "mytrivias", art: featuredMyTrivias, players: null, title: t("extra.myTriviaOption"), desc: t("extra.myTriviaDesc") },
  ];
  const { categories } = useCategories();
  const { isVip } = useVipStatus();

  // A dozen categories, mixed, dealt fresh on every visit: the seed is fixed
  // for this mount (random per refresh, stable while you browse — the cards
  // must not reshuffle under a finger when the list re-renders).
  const seed = useRef(Math.floor(Math.random() * 0x7fffffff));
  const railCategories = useMemo(() => dealMixed(categories, seed.current, 12), [categories]);

  // MyRoomsSection owns the rooms query; the header above it needs only the
  // count, to know whether "see all" has anything to show. Reported up
  // rather than fetched twice.
  const [roomsEmpty, setRoomsEmpty] = useState(false);

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

      {/* ── Play modes: the chooser's cards, compact ─────────────────────
          The same poster card the play chooser shows on the main button —
          the render up top with its foot dissolving into the lavender wash,
          the peach players pill, the title and blurb — at about half the
          chooser's height so a few sit in reach across the rail. The still
          stands in for the chooser's looping video: a rail of loops is a
          rail of decoders. */}
      <section>
        <RailHeader title={t("extra.railPlay")} desc={t("extra.railPlayDesc")} />
        <Rail>
          {playCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(`/create-room?mode=${card.key}`)}
              className="relative isolate block h-[258px] w-[196px] shrink-0 snap-start overflow-clip rounded-[24px] bg-[#e9d8ff] text-left shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_8px_24px_0px_rgba(15,23,41,0.1)] transition-transform active:scale-[0.97]"
            >
              {/* The render: a 3:4 still across the top, its foot masked out
                  over the same stretch the wash fades in. */}
              <div className="absolute left-0 top-0 z-0 aspect-[3/4] w-full overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
                <img
                  alt=""
                  src={card.art}
                  draggable={false}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover object-top"
                />
              </div>
              {/* The lavender wash over the lower 55%. */}
              <div className="absolute inset-x-0 bottom-0 z-10 h-[55%] bg-[linear-gradient(to_top,#f3e6ff_0%,#f3e6ff_50%,rgba(243,230,255,0)_100%)]" />
              {/* How many play: the peach pill, top right. */}
              {card.players && (
                <div className="absolute right-[8px] top-[8px] z-20 flex items-center gap-[4px] rounded-[14px] border-[2px] border-solid border-white/65 bg-gradient-to-b from-[#fff3ed] to-[#f5cdcd] px-[9px] py-[1px] shadow-[0px_2px_6px_0px_rgba(151,64,64,0.06),0px_2px_0px_0px_#d6c7c4]">
                  <img alt="" src={playersIcon} className="h-[13px] w-[10px]" />
                  <span className="whitespace-nowrap bg-gradient-to-b from-[#522b28] to-[#99665f] bg-clip-text font-hero text-[13px] capitalize leading-[20px] tracking-[-0.16px] text-transparent">
                    {card.players}
                  </span>
                </div>
              )}
              {/* Title and blurb, at the chooser's share of the height. */}
              <div className="absolute left-[16px] right-[12px] top-[calc(78.86%_-_14px)] z-20">
                <p className="overflow-hidden text-ellipsis whitespace-nowrap font-hero text-[16px] capitalize leading-[20px] tracking-[-0.16px] text-[#402666]">
                  {card.title}
                </p>
                <p className="mt-[4px] line-clamp-2 font-[Nunito] text-[11px] leading-[14px] tracking-[-0.16px] text-[#4b5563]">
                  {card.desc}
                </p>
              </div>
            </button>
          ))}
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
              // Two cards and the edge of a third, so the rail reads as a
              // rail rather than a pair. #543 widened these to 1.9 because
              // Georgian names were truncating at one line — the card's
              // title now wraps to two instead, which buys the same room
              // back without the width.
              <div key={cat.id} className="w-[max(164px,calc((100vw_-_56px)/2.35))] shrink-0 snap-start">
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

      {/* ── My Trivias (newest first, from the left) ────────────────────
          Shown even when there are none. Hiding the whole section meant a
          player who had never made one had no heading for it and no way in
          — the feature was invisible to exactly the people who had not found
          it yet. */}
      <section>
          <RailHeader
            title={t("extra.railMyTrivias")}
            desc={t("extra.railMyTriviasDesc")}
            action={
              trivias.length === 0
                ? {
                    label: t("extra.railFirstTrivia"),
                    onPress: () => navigate("/team", { state: { openTrivia: true } }),
                    kind: "add",
                  }
                : { label: t("extra.allTriviasBtn"), onPress: () => navigate("/team") }
            }
          />
          {/* Outside the scroller: the panel is the full width of the page,
              and a full-width child of a horizontal flex row would be sized
              by its content instead. */}
          {trivias.length === 0 && (
            <div className="px-4 pb-3 pt-1">
              <StartHereCard
                variant="trivia"
                title={t("extra.railFirstTrivia")}
                desc={t("extra.railFirstTriviaDesc")}
                onPress={() => navigate("/team", { state: { openTrivia: true } })}
              />
            </div>
          )}
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

      {/* ── Daily offers — the same full-card, arrowed reel as Pro ──────
          One deal fully in view at a time with arrows and dots, exactly as
          the Pro reel above. The old 300px strip cut the second card and
          its Purchase button off at the screen edge. */}
      <section>
        <RailHeader title={t("extra.railOffers")} desc={t("extra.railOffersDesc")} />
        <ProBannerReel
          slides="deals"
          purchasedItems={EMPTY_PURCHASES}
          isPurchasing={null}
          onItemClick={() => navigate("/power-ups")}
        />
      </section>
    </div>
  );
}

export default MobileHomeFeed;
