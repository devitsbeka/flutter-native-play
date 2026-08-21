import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, Library, Sparkles, ArrowLeft, Search, Plus, Check, AlertTriangle } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface Category {
  id: string;
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
  const [selectedItem, setSelectedItem] = useState<{
    type: "category" | "random" | "trivia";
    id?: string;
    name?: string;
    iconSlug?: string | null;
  } | null>(null);

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
    setSelectedItem(null);
  };

  const handleSelectNow = () => {
    if (!selectedItem) return;

    if (selectedItem.type === "random") {
      onSelectRandom();
    } else if (selectedItem.type === "category" && selectedItem.id && selectedItem.name) {
      onSelectCategory({ 
        id: selectedItem.id, 
        name: selectedItem.name,
        iconSlug: selectedItem.iconSlug 
      });
    } else if (selectedItem.type === "trivia" && selectedItem.id && selectedItem.name) {
      onSelectTrivia({ id: selectedItem.id, title: selectedItem.name });
    }
    
    onClose();
    setSelectedItem(null);
    setView("main");
  };

  const handleAddToQueue = () => {
    if (!selectedItem || !onAddToQueue) return;

    if (selectedItem.type === "random") {
      onAddToQueue({ source_type: "random", category_name: t("extra.randomCategoryName") });
    } else if (selectedItem.type === "category") {
      onAddToQueue({
        source_type: "category",
        category_id: selectedItem.id,
        category_name: selectedItem.name,
        icon_slug: selectedItem.iconSlug,
      });
    } else if (selectedItem.type === "trivia") {
      onAddToQueue({
        source_type: "user_trivia",
        user_trivia_id: selectedItem.id,
        category_name: selectedItem.name,
      });
    }

    // Close modal and reset state
    onClose();
    setSelectedItem(null);
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
        <div className={`flex-1 overflow-y-auto p-4 pb-8 ${selectedItem ? 'pb-40' : ''}`}>
          {view === "main" && (
            <div className="space-y-3 max-w-md mx-auto">
              {/* Random option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedItem({ type: "random" })}
                className={`w-full p-4 rounded-2xl backdrop-blur-sm transition-all text-left ${
                  selectedItem?.type === "random"
                    ? "bg-white/20 border-2 border-white/50"
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
                  {selectedItem?.type === "random" && (
                    <Check className="w-5 h-5 text-white" />
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
                        onClick={() => setSelectedItem({
                          type: "category",
                          id: "__mixed__",
                          name: t("extra.cpMixedCategory"),
                          iconSlug: "mystery-box",
                        })}
                        className={`p-4 rounded-xl backdrop-blur-sm transition-all text-left ${
                          selectedItem?.id === "__mixed__"
                            ? "bg-white/20 border-2 border-white/50"
                            : "bg-white/10 border border-white/20 hover:bg-white/15"
                        }`}
                        style={{ background: "linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(236, 72, 153, 0.3))" }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)" }}
                          >
                            <DynamicIcon slug="mystery-box" size={22} />
                          </div>
                           <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{t("extra.cpMixedCategory")}</p>
                            <p className="text-white/50 text-xs">{t("extra.cpMixedDesc")}</p>
                          </div>
                          {selectedItem?.id === "__mixed__" && (
                            <Check className="w-4 h-4 text-white flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    )}

                    {filteredCategories.map((cat, index) => (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (index + 1) * 0.02 }}
                        onClick={() => setSelectedItem({
                          type: "category",
                          id: cat.id,
                          name: cat.name,
                          iconSlug: cat.icon_slug,
                        })}
                        className={`p-4 rounded-xl backdrop-blur-sm transition-all text-left ${
                          selectedItem?.type === "category" && selectedItem.id === cat.id
                            ? "bg-white/20 border-2 border-white/50"
                            : "bg-white/10 border border-white/20 hover:bg-white/15"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: `${cat.color}40` }}
                          >
                            {cat.icon_slug ? (
                              <DynamicIcon slug={cat.icon_slug} size={22} />
                            ) : (
                              <span className="text-xl">{cat.icon}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{cat.name}</p>
                            <p className="text-white/50 text-xs">{t("extra.cpLevels", { count: cat.total_levels })}</p>
                          </div>
                          {selectedItem?.type === "category" && selectedItem.id === cat.id && (
                            <Check className="w-4 h-4 text-white flex-shrink-0" />
                          )}
                        </div>
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
                        onClick={() => setSelectedItem({
                          type: "trivia",
                          id: trivia.id,
                          name: trivia.title,
                        })}
                        className={`w-full p-3 rounded-xl backdrop-blur-sm transition-all text-left relative ${
                          selectedItem?.type === "trivia" && selectedItem.id === trivia.id
                            ? "bg-white/20 border-2 border-white/50"
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
                          {selectedItem?.type === "trivia" && selectedItem.id === trivia.id && (
                            <Check className="w-5 h-5 text-white flex-shrink-0" />
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

        {/* Footer buttons - show when item selected */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/5 backdrop-blur-sm border-t border-white/10"
          >
            <div className="max-w-md mx-auto space-y-3">
              {/* Primary action - Select now */}
              <ChunkyButton
                variant="white"
                size="lg"
                className="w-full"
                onClick={handleSelectNow}
              >
                {t("extra.cpSelectBtn")}
              </ChunkyButton>
              
              {/* Secondary action - Add to queue - Dashed outline style */}
              {showQueueOption && onAddToQueue && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToQueue}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-2xl bg-transparent border-2 border-dashed border-white/60 text-white hover:border-white hover:bg-white/5 transition-all"
                >
                   <Plus className="w-5 h-5" />
                   {t("extra.cpAddToQueue")}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
