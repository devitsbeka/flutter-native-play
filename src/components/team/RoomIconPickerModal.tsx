import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, Loader2, Search, X, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";
import triviaBuzzer from "@/assets/trivia-buzzer.png";

const RECENT_ROOM_ICONS_KEY = "recent-room-icons";
const MAX_RECENT_ICONS = 4;

// Icon categories - dbValues for querying, labels resolved via t() in component
const ICON_CATEGORIES_DATA = [
  { id: "all", key: "icAll", emoji: "✨", dbValue: null },
  { id: "animals", key: "icAnimals", emoji: "🐾", dbValue: "Animals" },
  { id: "food", key: "icFood", emoji: "🍕", dbValue: "Food & Drink" },
  { id: "places", key: "icPlaces", emoji: "🏠", dbValue: "Places & Structures" },
  { id: "nature", key: "icNature", emoji: "🌿", dbValue: "Nature & Outdoors" },
  { id: "sports", key: "icSports", emoji: "⚽", dbValue: "Sports" },
  { id: "entertainment", key: "icEntertainment", emoji: "🎮", dbValue: "Entertainment & Leisure" },
  { id: "tech", key: "icTech", emoji: "💻", dbValue: "Technology & Media" },
  { id: "vehicles", key: "icVehicles", emoji: "🚗", dbValue: "Vehicles & Transport" },
];

function getRecentIconSlugs(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_ROOM_ICONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentIcon(slug: string): void {
  const recent = getRecentIconSlugs().filter((s) => s !== slug);
  recent.unshift(slug);
  localStorage.setItem(
    RECENT_ROOM_ICONS_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_ICONS))
  );
}

interface IconItem {
  id: string;
  slug: string;
  title: string;
  icon_url: string;
}

interface RoomIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconUrl: string | null;
  roomName: string;
  onConfirm: (iconUrl: string, newName: string) => void;
}

export function RoomIconPickerModal({
  isOpen,
  onClose,
  currentIconUrl,
  roomName,
  onConfirm,
}: RoomIconPickerModalProps) {
  const { t, language } = useLanguage();
  const ICON_CATEGORIES = ICON_CATEGORIES_DATA.map(c => ({ ...c, label: t(`extra.${c.key}`) }));
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [searchResults, setSearchResults] = useState<IconItem[]>([]);
  const [recentIcons, setRecentIcons] = useState<IconItem[]>([]);
  const [categoryIcons, setCategoryIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [editableName, setEditableName] = useState(roomName);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasManuallyEditedName = useRef(false);

  // Load recent icons from localStorage
  const loadRecentIcons = useCallback(async () => {
    const slugs = getRecentIconSlugs();
    if (slugs.length === 0) {
      setRecentIcons([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .in("slug", slugs)
        .not("icon_url", "is", null);

      if (!error && data) {
        // Preserve the order from localStorage
        const iconMap = new Map(data.map(icon => [icon.slug, icon]));
        const orderedIcons = slugs
          .map(slug => iconMap.get(slug))
          .filter((icon): icon is IconItem => !!icon);
        setRecentIcons(orderedIcons);
      }
    } catch (e) {
      console.error("Failed to load recent icons:", e);
    }
  }, []);

  // Fetch icons by category
  const fetchCategoryIcons = useCallback(async (categoryDbValue: string | null) => {
    setIsCategoryLoading(true);
    try {
      let query = supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .not("icon_url", "is", null);

      if (categoryDbValue) {
        query = query.eq("category", categoryDbValue);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error("Error fetching category icons:", error);
        return;
      }

      if (data) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setCategoryIcons(shuffled.slice(0, 24) as IconItem[]);
      }
    } catch (e) {
      console.error("Failed to fetch category icons:", e);
    } finally {
      setIsCategoryLoading(false);
    }
  }, []);

  // Fetch random icons from database
  const fetchRandomIcons = useCallback(async () => {
    setIsLoading(true);
    try {
      const { count } = await supabase
        .from("icon_library")
        .select("*", { count: "exact", head: true })
        .not("icon_url", "is", null);

      if (!count || count === 0) {
        setIsLoading(false);
        return;
      }

      const randomOffset = Math.max(0, Math.floor(Math.random() * Math.max(1, count - 50)));
      const { data, error } = await supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .not("icon_url", "is", null)
        .range(randomOffset, randomOffset + 49);

      if (error) {
        console.error("Error fetching icons:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setSuggestedIcons(shuffled.slice(0, 28) as IconItem[]); // 28 suggestions (7 rows)
      }
    } catch (e) {
      console.error("Failed to fetch icons:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search icons by query using smart bilingual search
  const searchIcons = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use smart-icon-search for bilingual Georgian/English support
      const { data, error } = await supabase.functions.invoke('smart-icon-search', {
        body: { query: query.trim(), limit: 24 }
      });

      if (error) {
        console.error("Error searching icons:", error);
        return;
      }

      if (data?.icons) {
        setSearchResults(data.icons as IconItem[]);
      }
    } catch (e) {
      console.error("Failed to search icons:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery("");
    setSearchResults([]);
    
    const category = ICON_CATEGORIES.find(c => c.id === categoryId);
    if (category) {
      fetchCategoryIcons(category.dbValue);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchIcons(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchIcons]);

  // Load icons when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      fetchRandomIcons();
      loadRecentIcons();
      fetchCategoryIcons(null); // Load "all" category
      setSelectedIcon(currentIconUrl);
      setEditableName(roomName);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCategory("all");
      hasManuallyEditedName.current = false; // Reset on open
    }
  }, [isOpen, fetchRandomIcons, loadRecentIcons, fetchCategoryIcons, currentIconUrl, roomName]);

  // Auto-select room name text when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Generate name for a specific icon
  const generateNameForIcon = async (iconSlug: string) => {
    setIsGeneratingName(true);
    try {
      // Without the language the server defaults to Georgian — an English
      // user tapping an icon got a Georgian room name out of nowhere.
      const { data, error } = await supabase.functions.invoke('generate-room-name', {
        body: { iconSlug, language }
      });

      if (!error && data?.name) {
        setEditableName(data.name);
      }
    } catch (e) {
      console.error('Failed to generate name:', e);
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleIconClick = async (icon: IconItem) => {
    setSelectedIcon(icon.icon_url);
    addRecentIcon(icon.slug);
    
    // Only auto-generate name if user hasn't manually edited it
    if (!hasManuallyEditedName.current) {
      await generateNameForIcon(icon.slug);
    }
  };

  const handleConfirmClick = () => {
    if (selectedIcon && editableName.trim()) {
      onConfirm(selectedIcon, editableName.trim());
      onClose();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Determine which icons to display
  const getDisplayIcons = () => {
    if (searchQuery.trim()) return searchResults;
    if (selectedCategory !== "all") return categoryIcons;
    return suggestedIcons;
  };

  const getDisplayLoading = () => {
    if (searchQuery.trim()) return isSearching;
    if (selectedCategory !== "all") return isCategoryLoading;
    return isLoading;
  };

  const displayIcons = getDisplayIcons();
  const isDisplayLoading = getDisplayLoading();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 safe-screen z-50 bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF] h-[100dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-b border-border/30">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <h1 className="text-lg font-bold text-foreground">{t("extra.ripTitle")}</h1>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-b border-border/20">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-3 space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("extra.ripSearchPlaceholder")}
                  className="pl-10 pr-10 h-12 bg-muted/50 border-border rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category filters - horizontal scrollable */}
              {!searchQuery.trim() && (
                <div 
                  ref={categoryScrollRef}
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {ICON_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{category.emoji}</span>
                      <span>{category.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
              <div className="p-4 space-y-4">
              {/* Current icon preview with editable name */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                <div className="w-18 h-18 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                  {(selectedIcon || currentIconUrl) ? (
                    <motion.img
                      key={selectedIcon || currentIconUrl}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={selectedIcon || currentIconUrl || ""}
                      alt=""
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <img src={triviaBuzzer} alt="" className="w-10 h-10 object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="relative">
                    <Input
                      ref={nameInputRef}
                      value={editableName}
                      onChange={(e) => {
                        setEditableName(e.target.value);
                        hasManuallyEditedName.current = true;
                      }}
                      maxLength={35}
                      className="text-base font-semibold pr-8 bg-background h-12"
                      placeholder={t("extra.ripRoomNamePlaceholder")}
                      disabled={isGeneratingName}
                    />
                    {isGeneratingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("extra.ripEditHint")}
                  </p>
                </div>
              </div>

              {/* Recent icons section - only show if there are recent icons and not searching */}
              {!searchQuery.trim() && selectedCategory === "all" && recentIcons.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t("extra.ripRecentlyUsed")}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {recentIcons.slice(0, 4).map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => handleIconClick(icon)}
                        disabled={isGeneratingName}
                        className={`relative aspect-square rounded-xl bg-muted/50 hover:bg-muted border-2 transition-colors flex items-center justify-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedIcon === icon.icon_url
                            ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                            : "border-transparent hover:border-border"
                        }`}
                      >
                        <img
                          src={icon.icon_url}
                          alt={icon.title}
                          className="w-12 h-12 object-contain"
                          decoding="async"
                        />
                        {selectedIcon === icon.icon_url && (
                          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Icons section header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {searchQuery.trim() 
                    ? t("extra.ripSearchResults", { count: searchResults.length })
                    : selectedCategory !== "all"
                    ? ICON_CATEGORIES.find(c => c.id === selectedCategory)?.label || t("extra.ripCategory")
                    : t("extra.ripSuggested")
                  }
                </h3>
                {!searchQuery.trim() && selectedCategory === "all" && (
                  <button
                    onClick={fetchRandomIcons}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors text-xs font-medium text-emerald-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    {t("extra.ripRefresh")}
                  </button>
                )}
                {!searchQuery.trim() && selectedCategory !== "all" && (
                  <button
                    onClick={() => fetchCategoryIcons(ICON_CATEGORIES_DATA.find(c => c.id === selectedCategory)?.dbValue || null)}
                    disabled={isCategoryLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors text-xs font-medium text-emerald-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCategoryLoading ? "animate-spin" : ""}`} />
                    {t("extra.ripRefresh")}
                  </button>
                )}
              </div>

              {/* Icons grid - 4 columns
               *
               * Deliberately unanimated, and not inside AnimatePresence.
               *
               * Each tile used to fade and scale in on a `delay: index * 0.03`
               * stagger, so the last of 28 started 0.8s after the first and
               * the grid spent a second half-drawn — the icons looked like
               * they were failing to load rather than arriving. Worse, an
               * AnimatePresence in `mode="sync"` keeps the outgoing set
               * mounted while the incoming one animates in, so switching
               * category briefly laid two grids over each other and every
               * tile jumped a cell as the old ones left.
               *
               * The images are what the player is waiting for; a tile that
               * simply appears with its icon in it is both faster and
               * steadier than one that animates in around a slot that is
               * still empty. */}
              <div className="grid grid-cols-4 gap-3 pb-4">
                {isDisplayLoading ? (
                  Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="aspect-square rounded-xl bg-muted animate-pulse"
                    />
                  ))
                ) : displayIcons.length === 0 && searchQuery.trim() ? (
                  <div className="col-span-4 py-12 text-center text-muted-foreground text-sm">
                    {t("extra.iconNotFound")}
                  </div>
                ) : (
                  displayIcons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => handleIconClick(icon)}
                      disabled={isGeneratingName}
                      className={`relative aspect-square rounded-xl bg-muted/50 hover:bg-muted border-2 transition-colors flex items-center justify-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedIcon === icon.icon_url
                          ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      {/* Eager, and decoded off the main thread. These are
                          small icons in a grid that is mostly on screen the
                          moment it opens; deferring them bought nothing and
                          left empty squares scrolling past. */}
                      <img
                        src={icon.icon_url}
                        alt={icon.title}
                        className="w-12 h-12 object-contain"
                        decoding="async"
                      />
                      {selectedIcon === icon.icon_url && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border/30 bg-background pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
              <ChunkyButton
                onClick={handleConfirmClick}
                disabled={!selectedIcon || !editableName.trim() || isGeneratingName}
                className="w-full"
                variant="success"
              >
                <Check className="w-5 h-5 mr-2" />
                {t("extra.ripSelect")}
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
