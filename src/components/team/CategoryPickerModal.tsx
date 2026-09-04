import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowLeft, Search, Check, AlertTriangle, Eye } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { popularCategoryIcon } from "@/config/popularImageCategories";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { excludePartyCategories, pinPartyCategoriesFirst } from "@/config/partyCategories";
import { useAuth } from "@/contexts/AuthContext";
import iconDiceCard from "@/assets/play-chooser/icon-dice.webp";
import iconFiveRounds from "@/assets/spin-the-bottle.png";
import iconLibraryCard from "@/assets/play-chooser/icon-library.webp";
import stickerAlbum from "@/assets/sticker-album.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { IconTabBar } from "@/components/shared/IconTabBar";
import { useFavorites } from "@/hooks/useFavorites";
import {
  CategoryTabId,
  filterCategoriesByTab,
  readRecentlyViewedIds,
} from "@/utils/categoryTabs";

interface Category {
  id: string;
  /** Slug like "guess_flag" — keys the bundled art override. */
  categoryId?: string | null;
  /**
   * The same slug again, under the name the tab rules read.
   *
   * filterCategoriesByTab matches curated lists written in slugs, and it
   * looks for `category_id`; this file had renamed it to `categoryId` for
   * the artwork override. Without both, Popular here would have come back
   * empty exactly the way the library's did.
   */
  category_id?: string | null;
  name: string;
  icon: string;
  color: string;
  icon_slug?: string | null;
  total_levels: number;
  /** classic / fun / educational — what the type tabs filter on. */
  type?: string | null;
}

interface UserTrivia {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number;
  questions: any;
  is_blind?: boolean;
  user_id: string;
}

type ViewState = "main" | "library" | "my-trivias";

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: { id: string; name: string; iconSlug?: string | null }) => void;
  onSelectRandom: () => void;
  onSelectTrivia: (trivia: { id: string; title: string }) => void;
  onAddToQueue?: (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => void;
  showQueueOption?: boolean;
  /**
   * Party categories ("Most Likely To") are a private room's game: friends
   * the host invited, voting on each other. A public room, a TV session or
   * a solo surface never lists them. Off unless the opener says otherwise.
   */
  allowParty?: boolean;
  roomGradient?: string;
  excludeTriviaId?: string | null; // Trivia that was just played - should be hidden
}

export interface SelectedItem {
  type: "category" | "random" | "trivia";
  id?: string;
  name?: string;
  iconSlug?: string | null;
}

/**
 * Identity for a pick. A category and a user trivia can share an id, and
 * "random" has none at all, so the type has to be part of the key.
 */
export const selectionKey = (item: SelectedItem) => `${item.type}:${item.id ?? "-"}`;

/**
 * Tapping a card adds it; tapping it again takes it back off.
 *
 * Order is the order things were picked, because that is the order they are
 * added to the queue — the host builds the run they want to play.
 */
export function togglePicked(list: SelectedItem[], item: SelectedItem): SelectedItem[] {
  return list.some((s) => selectionKey(s) === selectionKey(item))
    ? list.filter((s) => selectionKey(s) !== selectionKey(item))
    : [...list, item];
}

/** The "mixed" pseudo-category, so its identity is written in one place. */
const MIXED_ITEM = (t: (k: string) => string): SelectedItem => ({
  type: "category",
  id: "__mixed__",
  name: t("extra.cpMixedCategory"),
  iconSlug: "mystery-box",
});

export function CategoryPickerModal({
  isOpen,
  onClose,
  onSelectCategory,
  onSelectRandom,
  onSelectTrivia,
  onAddToQueue,
  showQueueOption = true,
  allowParty = false,
  excludeTriviaId,
}: CategoryPickerModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [view, setView] = useState<ViewState>("main");
  const [search, setSearch] = useState("");
  /**
   * The same four tabs the standalone library has.
   *
   * This picker and CategorySelectorModal show the same wall of categories —
   * one when a host adds a round, one everywhere else — and only the other
   * one could sort it. Reaching a favourite from inside a room meant typing
   * its name or scrolling seventy tiles.
   */
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");
  const { favorites } = useFavorites();
  // Read once per opening: the list is written by the category page, and a
  // value that changed mid-scroll would reorder the grid under the thumb.
  const recentIds = useMemo(() => (isOpen ? readRecentlyViewedIds() : []), [isOpen]);

  const tabs = useMemo(
    () => [
      { id: "all", label: t("discover.all") },
      { id: "favorites", label: t("discover.favorites") },
      { id: "recently_viewed", label: t("discover.recentlyViewedTab") },
      { id: "popular", label: t("discover.popularTab") },
      { id: "classic", label: t("discover.classic") },
    ],
    [t],
  );
  /**
   * Everything picked so far, in the order it was picked.
   *
   * This used to hold one item, and the footer offered two buttons for it:
   * "select now", which set the round's category, and "add to queue". Two of
   * the four callers already routed select-now straight into the queue, and
   * picking several categories to line up is the thing a host actually wants
   * to do — so there is one action now, adding, and it takes as many as were
   * picked.
   */
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const isPicked = (item: SelectedItem) =>
    selectedItems.some((s) => selectionKey(s) === selectionKey(item));

  const togglePick = (item: SelectedItem) =>
    setSelectedItems((prev) => togglePicked(prev, item));

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ["categories-picker", language, allowParty],
    queryFn: async (): Promise<Category[]> => {
      const result = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (result.error) throw result.error;
      // categories.name is Georgian; overlay the reader's language. Party
      // categories ("Most Likely To") lead the wall of a PRIVATE room — they
      // are what a room full of friends is here to play together — and are
      // absent from every other wall.
      return (allowParty ? pinPartyCategoriesFirst : excludePartyCategories)(await localizeCategoryNames(
        filterCategoriesForLanguage(result.data || [], language).map(d => ({
          id: d.id,
          categoryId: d.category_id,
          category_id: d.category_id,
          name: d.name,
          icon: d.icon,
          color: d.color,
          icon_slug: d.icon_slug,
          total_levels: d.total_levels,
          type: d.type,
        })),
      ));
    },
    enabled: isOpen && view === "library",
  });

  // Fetch user's trivias with is_blind for observer indicator
  const { data: myTrivias = [], isLoading: loadingTrivias } = useQuery<UserTrivia[]>({
    queryKey: ["my-trivias-picker", user?.id],
    queryFn: async (): Promise<UserTrivia[]> => {
      if (!user?.id) return [];
      
      const result = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, cover_gradient, plays_count, questions, is_blind, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (result.error) throw result.error;
      return (result.data || []) as UserTrivia[];
    },
    enabled: isOpen && view === "my-trivias" && !!user?.id,
  });

  // Filter categories
  const filteredCategories = useMemo(() => {
    // Tab first, then the query inside it — you picked Favourites for a
    // reason, and a search that ignored it would answer a question nobody
    // asked. Same order as the standalone library.
    const inTab = filterCategoriesByTab(categories, activeTab, { favorites, recentIds });
    if (!search.trim()) return inTab;
    const searchLower = search.toLowerCase();
    return inTab.filter((cat) =>
      cat.name.toLowerCase().includes(searchLower)
    );
  }, [categories, search, activeTab, favorites, recentIds]);

  // Filter trivias - exclude the trivia that was just played
  const filteredTrivias = useMemo(() => {
    let result = myTrivias;
    
    // Exclude the trivia that was just played (user already knows the answers)
    if (excludeTriviaId) {
      result = result.filter(t => t.id !== excludeTriviaId);
    }
    
    if (!search.trim()) return result;
    const searchLower = search.toLowerCase();
    return result.filter((t) =>
      t.title.toLowerCase().includes(searchLower)
    );
  }, [myTrivias, search, excludeTriviaId]);

  const handleBack = () => {
    setView("main");
    setSearch("");
    setSelectedItems([]);
  };

  /**
   * Add everything picked.
   *
   * One action instead of the old select-now / add-to-queue pair. Every
   * caller supplies onAddToQueue, and adding is the only thing that makes
   * sense for more than one pick — you cannot play three categories at once.
   *
   * onSelectCategory and the rest stay in the props: a single pick with no
   * queue handler still goes through them, which keeps any future caller
   * that does not want a queue working rather than silently doing nothing.
   */
  const handleAddPicked = () => {
    if (selectedItems.length === 0) return;

    if (!onAddToQueue) {
      const only = selectedItems[0];
      if (only.type === "random") onSelectRandom();
      else if (only.type === "category" && only.id && only.name) {
        onSelectCategory({ id: only.id, name: only.name, iconSlug: only.iconSlug });
      } else if (only.type === "trivia" && only.id && only.name) {
        onSelectTrivia({ id: only.id, title: only.name });
      }
    } else {
      // In the order they were picked, so the queue reads the way the host
      // built it.
      for (const item of selectedItems) {
        if (item.type === "random") {
          onAddToQueue({ source_type: "random", category_name: t("extra.randomCategoryName") });
        } else if (item.type === "category") {
          onAddToQueue({
            source_type: "category",
            category_id: item.id,
            category_name: item.name,
            icon_slug: item.iconSlug,
          });
        } else if (item.type === "trivia") {
          onAddToQueue({
            source_type: "user_trivia",
            user_trivia_id: item.id,
            category_name: item.name,
          });
        }
      }
    }

    onClose();
    setSelectedItems([]);
    setView("main");
  };

  /**
   * Deal five random-category rounds in one tap (owner's ask). It queues
   * five when there is a queue to add to; without one it falls back to the
   * single random round the other callers expect.
   */
  const handlePickFiveRandom = () => {
    if (onAddToQueue) {
      for (let i = 0; i < 5; i++) {
        onAddToQueue({ source_type: "random", category_name: t("extra.randomCategoryName") });
      }
    } else {
      onSelectRandom();
    }
    onClose();
    setSelectedItems([]);
    setView("main");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 safe-screen z-[120] flex flex-col bg-background"
      >
        {/* Soft lilac wash — the same family as the screens behind it
            (Figma 926-11424). The dark takeover this replaced read like a
            different app; roomGradient is deliberately ignored now. */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(249,219,255,0.55) 0%, rgba(249,219,255,0.3) 45%, rgba(249,219,255,0.55) 100%)" }}
        />
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {view !== "main" ? (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          ) : (
            <div className="w-10" />
          )}
          <h2 className="text-lg font-display text-primary">
            {view === "main" && t("extra.cpSelectCategory")}
            {view === "library" && t("extra.cpLibrary")}
            {view === "my-trivias" && t("extra.cpMyTrivias")}
          </h2>
          <motion.button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 pb-8 ${selectedItems.length > 0 ? 'pb-40' : ''}`}>
          {view === "main" && (
            /* The three sources as light cards with their 3D faces — the same
               art the online-game reel wears (Figma 926-11424). */
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:max-w-[1100px] md:grid-cols-4">
              {(
                [
                  { key: "random", icon: iconDiceCard, title: t("extra.cpRandomTitle"), desc: t("extra.cpRandomDesc"), onTap: () => togglePick({ type: "random" }), picked: isPicked({ type: "random" }) },
                  { key: "random5", icon: iconFiveRounds, title: t("extra.cpRandom5Title"), desc: t("extra.cpRandom5Desc"), onTap: handlePickFiveRandom, picked: false },
                  { key: "library", icon: iconLibraryCard, title: t("extra.cpLibraryTitle"), desc: t("extra.cpLibraryDesc"), onTap: () => setView("library"), picked: false },
                  { key: "my-trivias", icon: stickerAlbum, title: t("extra.cpMyTriviasTitle"), desc: t("extra.cpMyTriviasDesc"), onTap: () => setView("my-trivias"), picked: false },
                ]
              ).map((card) => (
                <motion.button
                  key={card.key}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 480, damping: 28 }}
                  onClick={card.onTap}
                  className={`relative rounded-[24px] p-4 pt-6 bg-white/70 border border-solid text-left transition-shadow ${
                    card.picked
                      ? "border-[#7126d5] shadow-[0px_4px_4px_0px_rgba(113,38,213,0.42)]"
                      : "border-[rgba(211,211,211,0.5)]"
                  }`}
                >
                  {card.picked && (
                    <div className="absolute right-[10px] top-[12px] w-[30px] h-[30px] rounded-full bg-[rgba(113,38,213,0.08)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#7126d5]" strokeWidth={3.5} />
                    </div>
                  )}
                  <div className="h-[96px] flex items-center justify-center mb-3">
                    <img src={card.icon} alt="" className="w-[86px] h-[86px] object-contain" />
                  </div>
                  <p className="font-[Nunito] font-bold text-[16px] leading-[24px] text-[#0f1729]">{card.title}</p>
                  <p className="font-[Nunito] text-[14px] leading-[20px] text-[#6b7280]">{card.desc}</p>
                </motion.button>
              ))}
            </div>
          )}

          {view === "library" && (
            <div className="space-y-4 max-w-md mx-auto md:max-w-[1100px]">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder={t("extra.cpSearchCategories")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 border border-border/50 text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 outline-none"
                />
              </div>

              {/* The strip carries its own bleed — -mx-4 with 16px of scroll
                  padding — so the first pill lands exactly on this column's
                  edge, in line with the search field above and the cards
                  below. A second -mx-4 out here pulled it 16px further left
                  than everything it is meant to line up with. */}
              <IconTabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as CategoryTabId)}
                compact
              />

              {/* Categories grid */}
              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Two across on a phone; from tablet up the wide column
                      shows four or five, so the whole library is a glance
                      rather than a scroll. */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                    {/* Mixed Category - First in grid */}
                    {(!search.trim() || t("extra.cpMixedCategory").toLowerCase().includes(search.toLowerCase())) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0 }}
                        onClick={() => togglePick(MIXED_ITEM(t))}
                        className={`relative p-3 rounded-xl transition-all text-left ${
                          isPicked(MIXED_ITEM(t))
                            ? "bg-white border-2 border-[#7126d5]"
                            : "bg-white/70 border border-border/50 hover:bg-white"
                        }`}
                      >
                        {isPicked(MIXED_ITEM(t)) && (
                          <Check className="absolute right-2 top-2 w-4 h-4 text-[#7126d5]" />
                        )}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}
                        >
                          <DynamicIcon slug="mystery-box" size={22} />
                        </div>
                        <p className="mt-2 font-medium text-foreground text-sm leading-snug break-words">
                          {t("extra.cpMixedCategory")}
                        </p>
                        <p className="text-muted-foreground text-xs">{t("extra.cpMixedDesc")}</p>
                      </motion.button>
                    )}

                    {filteredCategories.map((cat, index) => (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (index + 1) * 0.02 }}
                        onClick={() => togglePick({
                          type: "category",
                          id: cat.id,
                          name: cat.name,
                          iconSlug: cat.icon_slug,
                        })}
                        className={`relative p-3 rounded-xl transition-all text-left ${
                          isPicked({ type: "category", id: cat.id })
                            ? "bg-white border-2 border-[#7126d5]"
                            : "bg-white/70 border border-border/50 hover:bg-white"
                        }`}
                      >
                        {isPicked({ type: "category", id: cat.id }) && (
                          <Check className="absolute right-2 top-2 w-4 h-4 text-[#7126d5]" />
                        )}
                        {/* Icon on its own line, name underneath. The two used
                            to sit side by side, which left the name a sliver
                            of a half-width card and most of them ended in an
                            ellipsis — a category you cannot read is one you
                            cannot choose. */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: `${cat.color}40` }}
                        >
                          {popularCategoryIcon(cat.categoryId) ? (
                            <img src={popularCategoryIcon(cat.categoryId)!} alt="" className="w-[26px] h-[26px] object-contain" />
                          ) : cat.icon_slug ? (
                            <DynamicIcon slug={cat.icon_slug} size={22} />
                          ) : (
                            <span className="text-xl">{cat.icon}</span>
                          )}
                        </div>
                        <p className="mt-2 font-medium text-foreground text-sm leading-snug break-words">
                          {cat.name}
                        </p>
                        <p className="text-muted-foreground text-xs">{t("extra.cpLevels", { count: cat.total_levels })}</p>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {view === "my-trivias" && (
            <div className="space-y-4 max-w-md mx-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                   placeholder={t("extra.cpSearchTrivias")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 border border-border/50 text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 outline-none"
                />
              </div>

              {/* Trivias list */}
              {loadingTrivias ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTrivias.length === 0 ? (
                <div className="text-center py-12">
                   <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                   <p className="text-muted-foreground">{t("extra.cpNoTriviaFound")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTrivias.map((trivia, index) => {
                    const questionCount = Array.isArray(trivia.questions) ? trivia.questions.length : 0;
                    // Count questions missing icon_slug
                    const missingIconCount = Array.isArray(trivia.questions)
                      ? trivia.questions.filter((q: any) => !q.icon_slug).length
                      : 0;
                    // Host will be observer if: it's NOT blind OR they've already played it
                    const willBeObserver = trivia.user_id === user?.id && 
                      (!trivia.is_blind || (trivia.plays_count || 0) > 0);
                    
                    return (
                      <motion.button
                        key={trivia.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => togglePick({
                          type: "trivia",
                          id: trivia.id,
                          name: trivia.title,
                        })}
                        className={`w-full p-3 rounded-xl transition-all text-left relative ${
                          isPicked({ type: "trivia", id: trivia.id })
                            ? "bg-white border-2 border-[#7126d5]"
                            : "bg-white/70 border border-border/50 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                            style={{ background: trivia.cover_gradient || "linear-gradient(135deg, #667eea, #764ba2)" }}
                          >
                            {trivia.cover_image && (
                              <img 
                                src={trivia.cover_image} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{trivia.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                               <p className="text-muted-foreground text-xs">
                                 {t("extra.cpQuestionAndPlays", { questions: questionCount, plays: trivia.plays_count || 0 })}
                              </p>
                               {trivia.is_blind && (trivia.plays_count || 0) === 0 && (
                                 <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 text-[10px] font-medium">
                                   {t("extra.cpBlindLabel")}
                                </span>
                              )}
                            </div>
                            {/* Observer note and the missing-icons warning share
                                a line under the title. The observer badge used to
                                be pinned to the row's top-right corner, where it
                                sat on top of the title of any trivia whose name
                                reached the end of the row. */}
                            {willBeObserver && (
                              <span className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                <Eye className="w-3 h-3" />
                                {t("extra.cpObserverLabel")}
                              </span>
                            )}
                            {missingIconCount > 0 && (
                               <span className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                 <AlertTriangle className="w-3 h-3" />
                                 {t("extra.cpMissingIcons", { count: missingIconCount })}
                              </span>
                            )}
                          </div>
                          {isPicked({ type: "trivia", id: trivia.id }) && (
                            <Check className="w-5 h-5 text-[#7126d5] flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* One action, and it says how much it is about to add. */}
        {selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/60 backdrop-blur-sm border-t border-border/40"
          >
            <div className="max-w-md mx-auto">
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleAddPicked}
              >
                {t("extra.cpAddBtn")} ({selectedItems.length})
              </ChunkyButton>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
