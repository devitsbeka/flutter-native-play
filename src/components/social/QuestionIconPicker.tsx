import { useState, useEffect } from "react";
import { Search, X, Smile, AlertTriangle, ChevronLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { validateIconKeyword } from "@/utils/iconAnswerValidation";
import { ChunkyButton } from "@/components/ui/chunky-button";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface IconItem {
  id: string;
  slug: string;
  title: string;
  icon_url: string | null;
}

interface QuestionIconPickerProps {
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  questionText?: string;
  correctAnswer?: string;
  incorrectAnswers?: string[];
  large?: boolean;
}

export function QuestionIconPicker({ selectedSlug, onSelect, questionText, correctAnswer, incorrectAnswers, large = false }: QuestionIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [selectedIconData, setSelectedIconData] = useState<IconItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [suggestionSeed, setSuggestionSeed] = useState(0);

  const getIconUrl = (icon: IconItem): string => {
    if (icon.icon_url) return icon.icon_url;
    return `${ICON_STORAGE_URL}/${icon.slug}.png`;
  };

  // Check if text contains Georgian characters
  const isGeorgian = (text: string) => /[\u10A0-\u10FF]/.test(text);

  // Check if an icon is safe (doesn't reveal the answer)
  const isIconSafe = (iconSlug: string): boolean => {
    if (!correctAnswer) return true;
    const validation = validateIconKeyword(iconSlug, correctAnswer, incorrectAnswers);
    return validation.isValid;
  };

  // Load selected icon data when popover opens
  useEffect(() => {
    if (!open || !selectedSlug) {
      setSelectedIconData(null);
      return;
    }

    const loadSelectedIcon = async () => {
      const { data } = await supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .eq("slug", selectedSlug)
        .single();
      
      if (data) setSelectedIconData(data);
    };

    loadSelectedIcon();
  }, [open, selectedSlug]);

  // Load suggestions based on question text
  const loadSuggestions = async (isRefresh = false) => {
    if (!questionText) {
      setSuggestedIcons([]);
      return;
    }

    if (isRefresh) {
      setIsRefreshingSuggestions(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('smart-icon-search', {
        body: { 
          query: questionText, 
          limit: 20,
          correctAnswer: correctAnswer,
          seed: isRefresh ? Date.now() : suggestionSeed,
          shuffle: isRefresh
        }
      });
      
      if (!error && data?.icons) {
        // Filter out icons that reveal the answer
        const safeIcons = data.icons.filter((icon: IconItem) => isIconSafe(icon.slug));
        setSuggestedIcons(safeIcons.slice(0, 8));
      }
    } catch (err) {
      console.error("Error loading suggestions:", err);
    } finally {
      setIsRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    loadSuggestions();
  }, [open, questionText, correctAnswer]);

  const handleRefreshSuggestions = () => {
    setSuggestionSeed(Date.now());
    loadSuggestions(true);
  };

  // Fetch random library icons
  const fetchRandomLibraryIcons = async () => {
    setIsLoadingLibrary(true);
    try {
      // Get total count for random offset
      const { count } = await supabase
        .from("icon_library")
        .select("*", { count: "exact", head: true });
      
      const totalCount = count || 500;
      const offset = Math.floor(Math.random() * Math.max(1, totalCount - 50));
      
      const { data } = await supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .range(offset, offset + 49);
      
      // Shuffle for extra randomness
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      setIcons(shuffled);
    } catch (error) {
      console.error("Error fetching random icons:", error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Load random library icons when modal opens
  useEffect(() => {
    if (open && !searchQuery) {
      fetchRandomLibraryIcons();
    }
  }, [open]);

  // Search icons when query changes
  useEffect(() => {
    if (!open) return;
    
    const searchIcons = async () => {
      if (!searchQuery.trim()) {
        // Don't reset icons here - fetchRandomLibraryIcons handles it
        return;
      }
      
      setIsLoading(true);
      try {
        // Always use smart search for both Georgian AND English queries
        const { data, error } = await supabase.functions.invoke('smart-icon-search', {
          body: { query: searchQuery, limit: 50 }
        });
        
        if (error) throw error;
        setIcons(data?.icons || []);
      } catch (error) {
        console.error("Error searching icons:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchIcons, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, open]);

  const handleSelect = (slug: string) => {
    onSelect(slug);
    setOpen(false);
    setSearchQuery("");
  };

  const handleRemove = () => {
    onSelect(null);
    setOpen(false);
  };

  // Check if currently selected icon is unsafe
  const selectedIconUnsafe = selectedSlug && !isIconSafe(selectedSlug);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-2xl flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 relative ${
          selectedIconUnsafe 
            ? "border-2 border-destructive bg-destructive/10" 
            : ""
        }`}
        style={{ width: large ? 103 : 58, height: large ? 103 : 58 }}
      >
        {selectedSlug ? (
          <>
            <img
              src={`${ICON_STORAGE_URL}/${selectedSlug}.png`}
              alt=""
              style={{ width: large ? 94 : 50, height: large ? 94 : 50 }}
              className="object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {selectedIconUnsafe && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
            )}
          </>
        ) : (
          <Smile style={{ width: large ? 62 : 38, height: large ? 62 : 38 }} className="text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 safe-top">
              <div className="flex items-center gap-3 px-4 py-3">
                <button 
                  onClick={() => setOpen(false)} 
                  className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>
                <div className="flex-1">
                  <h1 className="text-lg font-bold text-foreground">აირჩიე აიკონი</h1>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-full overflow-y-auto pt-[60px] pb-24 safe-top">
              <div className="p-4 space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ძებნა..."
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>

                {/* Current selected icon */}
                {selectedSlug && selectedIconData && (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <img
                      src={getIconUrl(selectedIconData)}
                      alt={selectedIconData.title}
                      className="w-14 h-14 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">მიმდინარე აიკონი</p>
                      <p className="text-sm font-medium truncate">{selectedIconData.title}</p>
                    </div>
                  </div>
                )}

                {/* Suggestions section */}
                {suggestedIcons.length > 0 && !searchQuery && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-xs font-medium text-muted-foreground">შემოთავაზებული</p>
                      <button
                        onClick={handleRefreshSuggestions}
                        disabled={isRefreshingSuggestions}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshingSuggestions ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {suggestedIcons.slice(0, 8).map((icon) => (
                        <button
                          key={icon.id}
                          onClick={() => handleSelect(icon.slug)}
                          className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all hover:scale-105 ${
                            selectedSlug === icon.slug
                              ? "border-primary bg-primary/10"
                              : "border-border bg-muted/30 hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={getIconUrl(icon)}
                            alt={icon.title}
                            className="object-contain"
                            style={{ width: 86, height: 86 }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Library section */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-xs font-medium text-muted-foreground">ბიბლიოთეკა</p>
                    {!searchQuery && (
                      <button
                        onClick={fetchRandomLibraryIcons}
                        disabled={isLoadingLibrary}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                  {isLoading || isLoadingLibrary ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : icons.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      აიკონი ვერ მოიძებნა
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {icons.map((icon) => {
                        const isSafe = isIconSafe(icon.slug);
                        return (
                          <button
                            key={icon.id}
                            onClick={() => isSafe && handleSelect(icon.slug)}
                            disabled={!isSafe}
                            className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all relative ${
                              !isSafe
                                ? "border-destructive/50 bg-destructive/5 opacity-50 cursor-not-allowed"
                                : selectedSlug === icon.slug
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-muted/30 hover:border-primary/50 hover:scale-105"
                            }`}
                            title={isSafe ? icon.title : `${icon.title} - მინიშნება პასუხზე!`}
                          >
                            <img
                              src={getIconUrl(icon)}
                              alt={icon.title}
                              className="object-contain"
                              style={{ width: 86, height: 86 }}
                            />
                            {!isSafe && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            {selectedSlug && (
              <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-background safe-bottom">
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors border border-destructive/20"
                >
                  <X className="w-4 h-4" />
                  აიკონის წაშლა
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
