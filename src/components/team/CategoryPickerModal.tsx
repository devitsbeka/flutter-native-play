import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, Library, Sparkles, ArrowLeft, Search, Plus, Check, AlertTriangle } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { popularCategoryIcon } from "@/config/popularImageCategories";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface Category {
  id: string;
  /** Slug like "guess_flag" — keys the bundled art override. */
  categoryId?: string | null;
  name: string;
  icon: string;
  color: string;
  icon_slug?: string | null;
  total_levels: number;
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
  roomGradient,
  excludeTriviaId,
}: CategoryPickerModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [view, setView] = useState<ViewState>("main");
  const [search, setSearch] = useState("");
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
    queryKey: ["categories-picker", language],
    queryFn: async (): Promise<Category[]> => {
      const result = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (result.error) throw result.error;
      // categories.name is Georgian; overlay the reader's language.
      return localizeCategoryNames(
        filterCategoriesForLanguage(result.data || [], language).map(d => ({
          id: d.id,
          categoryId: d.category_id,
          name: d.name,
          icon: d.icon,
          color: d.color,
          icon_slug: d.icon_slug,
          total_levels: d.total_levels,
        })),
      );
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
    if (!search.trim()) return categories;
    const searchLower = search.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchLower)
    );
  }, [categories, search]);

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

  if (!isOpen) return null;

  const defaultGradient = "linear-gradient(135deg, #1a1a2e, #16213e)";
  const backgroundStyle = roomGradient || defaultGradient;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 safe-screen z-[120] flex flex-col"
        style={{ background: `#1a1a2e` }}
      >
        {/* Opaque gradient overlay */}
        <div 
          className="absolute inset-0 -z-10" 
          style={{ background: backgroundStyle }}
        />
        {/* Glass header */}
        <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm">
          {view !== "main" ? (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
          ) : (
            <div className="w-9" />
          )}
          <h2 className="text-lg font-bold text-white">
            {view === "main" && t("extra.cpSelectCategory")}
            {view === "library" && t("extra.cpLibrary")}
            {view === "my-trivias" && t("extra.cpMyTrivias")}
          </h2>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 pb-8 ${selectedItems.length > 0 ? 'pb-40' : ''}`}>
          {view === "main" && (
            <div className="space-y-3 max-w-md mx-auto">
              {/* Random option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => togglePick({ type: "random" })}
                className={`w-full p-4 rounded-2xl backdrop-blur-sm transition-all text-left ${
                  isPicked({ type: "random" })
                    ? "bg-white/20 border-2 border-emerald-400"
                    : "bg-white/10 border border-white/20 hover:bg-white/15"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shuffle className="w-7 h-7 text-purple-400" />
                  </div>
                   <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{t("extra.cpRandomTitle")}</p>
                    <p className="text-white/60 text-sm">{t("extra.cpRandomDesc")}</p>
                  </div>
                  {isPicked({ type: "random" }) && (
                    <Check className="w-5 h-5 text-emerald-300" />
                  )}
                </div>
              </motion.button>

              {/* Library option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView("library")}
                className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Library className="w-7 h-7 text-purple-400" />
                  </div>
                   <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{t("extra.cpLibraryTitle")}</p>
                    <p className="text-white/60 text-sm">{t("extra.cpLibraryDesc")}</p>
                  </div>
                </div>
              </motion.button>

              {/* My Trivias option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView("my-trivias")}
                className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-purple-400" />
                  </div>
                   <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{t("extra.cpMyTriviasTitle")}</p>
                    <p className="text-white/60 text-sm">{t("extra.cpMyTriviasDesc")}</p>
                  </div>
                </div>
              </motion.button>
            </div>
          )}

          {view === "library" && (
            <div className="space-y-4 max-w-md mx-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  placeholder={t("extra.cpSearchCategories")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 outline-none backdrop-blur-sm"
                />
              </div>

              {/* Categories grid */}
              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Mixed Category - First in grid */}
                    {(!search.trim() || t("extra.cpMixedCategory").toLowerCase().includes(search.toLowerCase())) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0 }}
                        onClick={() => togglePick(MIXED_ITEM(t))}
                        className={`relative p-3 rounded-xl backdrop-blur-sm transition-all text-left ${
                          isPicked(MIXED_ITEM(t))
                            ? "bg-white/20 border-2 border-emerald-400"
                            : "bg-white/10 border border-white/20 hover:bg-white/15"
                        }`}
                        style={{ background: "linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))" }}
                      >
                        {isPicked(MIXED_ITEM(t)) && (
                          <Check className="absolute right-2 top-2 w-4 h-4 text-emerald-300" />
                        )}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}
                        >
                          <DynamicIcon slug="mystery-box" size={22} />
                        </div>
                        <p className="mt-2 font-medium text-white text-sm leading-snug break-words">
                          {t("extra.cpMixedCategory")}
                        </p>
                        <p className="text-white/50 text-xs">{t("extra.cpMixedDesc")}</p>
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
                        className={`relative p-3 rounded-xl backdrop-blur-sm transition-all text-left ${
                          isPicked({ type: "category", id: cat.id })
                            ? "bg-white/20 border-2 border-emerald-400"
                            : "bg-white/10 border border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {isPicked({ type: "category", id: cat.id }) && (
                          <Check className="absolute right-2 top-2 w-4 h-4 text-emerald-300" />
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
                        <p className="mt-2 font-medium text-white text-sm leading-snug break-words">
                          {cat.name}
                        </p>
                        <p className="text-white/50 text-xs">{t("extra.cpLevels", { count: cat.total_levels })}</p>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                   placeholder={t("extra.cpSearchTrivias")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 outline-none backdrop-blur-sm"
                />
              </div>

              {/* Trivias list */}
              {loadingTrivias ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTrivias.length === 0 ? (
                <div className="text-center py-12">
                   <Sparkles className="w-12 h-12 text-white/30 mx-auto mb-3" />
                   <p className="text-white/60">{t("extra.cpNoTriviaFound")}</p>
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
                        className={`w-full p-3 rounded-xl backdrop-blur-sm transition-all text-left relative ${
                          isPicked({ type: "trivia", id: trivia.id })
                            ? "bg-white/20 border-2 border-emerald-400"
                            : "bg-white/10 border border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {/* Observer badge */}
                         {willBeObserver && (
                           <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/80 text-white text-[10px] font-medium">
                             👁️ {t("extra.cpObserverLabel")}
                          </span>
                        )}
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
                            <p className="font-medium text-white truncate">{trivia.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                               <p className="text-white/50 text-xs">
                                 {t("extra.cpQuestionAndPlays", { questions: questionCount, plays: trivia.plays_count || 0 })}
                              </p>
                               {trivia.is_blind && (trivia.plays_count || 0) === 0 && (
                                 <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-medium">
                                   {t("extra.cpBlindLabel")}
                                </span>
                              )}
                            </div>
                            {/* Missing icons warning */}
                            {missingIconCount > 0 && (
                               <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                                 <AlertTriangle className="w-3 h-3" />
                                 {t("extra.cpMissingIcons", { count: missingIconCount })}
                              </span>
                            )}
                          </div>
                          {isPicked({ type: "trivia", id: trivia.id }) && (
                            <Check className="w-5 h-5 text-emerald-300 flex-shrink-0" />
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
            className="p-4 bg-white/5 backdrop-blur-sm border-t border-white/10"
          >
            <div className="max-w-md mx-auto">
              <ChunkyButton
                variant="white"
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
