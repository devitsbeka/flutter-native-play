import { useState, useEffect } from "react";
import { Search, X, ImageIcon, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateIconKeyword } from "@/utils/iconAnswerValidation";

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
}

export function QuestionIconPicker({ selectedSlug, onSelect, questionText, correctAnswer, incorrectAnswers }: QuestionIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [selectedIconData, setSelectedIconData] = useState<IconItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  useEffect(() => {
    if (!open || !questionText) {
      setSuggestedIcons([]);
      return;
    }

    const loadSuggestions = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('smart-icon-search', {
          body: { 
            query: questionText, 
            limit: 12,
            correctAnswer: correctAnswer 
          }
        });
        
        if (!error && data?.icons) {
          // Filter out icons that reveal the answer
          const safeIcons = data.icons.filter((icon: IconItem) => isIconSafe(icon.slug));
          setSuggestedIcons(safeIcons.slice(0, 8));
        }
      } catch (err) {
        console.error("Error loading suggestions:", err);
      }
    };

    loadSuggestions();
  }, [open, questionText, correctAnswer]);

  // Search icons when query changes
  useEffect(() => {
    if (!open) return;
    
    const searchIcons = async () => {
      setIsLoading(true);
      try {
        if (searchQuery.trim() && isGeorgian(searchQuery)) {
          const { data, error } = await supabase.functions.invoke('smart-icon-search', {
            body: { query: searchQuery, limit: 50 }
          });
          
          if (error) throw error;
          setIcons(data?.icons || []);
        } else {
          let query = supabase
            .from("icon_library")
            .select("id, slug, title, icon_url")
            .limit(50);

          if (searchQuery.trim()) {
            query = query.or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
          }

          const { data, error } = await query;
          if (error) throw error;
          setIcons(data || []);
        }
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
        className={`w-12 h-12 rounded-xl border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0 relative ${
          selectedIconUnsafe 
            ? "border-destructive bg-destructive/10" 
            : "border-border bg-muted/50"
        }`}
      >
        {selectedSlug ? (
          <>
            <img
              src={`${ICON_STORAGE_URL}/${selectedSlug}.png`}
              alt=""
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {selectedIconUnsafe && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                <AlertTriangle className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </>
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">აირჩიე აიკონი</h3>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ძებნა..."
                className="pl-9 h-10"
              />
            </div>

          {/* Current selected icon */}
          {selectedSlug && selectedIconData && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <img
                src={getIconUrl(selectedIconData)}
                alt={selectedIconData.title}
                className="w-12 h-12 object-contain"
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
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">შემოთავაზებული</p>
              <div className="grid grid-cols-4 gap-2">
                {suggestedIcons.slice(0, 8).map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelect(icon.slug)}
                    className={`flex flex-col items-center p-1.5 rounded-xl border transition-all hover:scale-105 ${
                      selectedSlug === icon.slug
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={getIconUrl(icon)}
                      alt={icon.title}
                      className="w-12 h-12 object-contain"
                    />
                        <span className="text-[10px] text-muted-foreground mt-1 px-0.5 text-center leading-tight" style={{ wordBreak: 'break-word' }}>
                          {icon.title}
                        </span>
                      </button>
                ))}
              </div>
            </div>
          )}

          {/* Library section */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">ბიბლიოთეკა</p>
            <ScrollArea className="h-48">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : icons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  აიკონი ვერ მოიძებნა
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 p-1">
                  {icons.map((icon) => {
                    const isSafe = isIconSafe(icon.slug);
                    return (
                      <button
                        key={icon.id}
                        onClick={() => isSafe && handleSelect(icon.slug)}
                        disabled={!isSafe}
                        className={`flex flex-col items-center p-1.5 rounded-xl border transition-all relative ${
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
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 px-0.5 text-center leading-tight" style={{ wordBreak: 'break-word' }}>
                          {icon.title}
                        </span>
                        {!isSafe && (
                          <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center">
                            <X className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          </div>

          {selectedSlug && (
            <div className="px-4 pb-4">
              <button
                onClick={handleRemove}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
              >
                <X className="w-3.5 h-3.5" />
                წაშლა
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
