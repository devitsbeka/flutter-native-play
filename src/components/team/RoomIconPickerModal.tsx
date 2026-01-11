import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [searchResults, setSearchResults] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [editableName, setEditableName] = useState(roomName);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setSuggestedIcons(shuffled.slice(0, 12) as IconItem[]);
      }
    } catch (e) {
      console.error("Failed to fetch icons:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search icons by query
  const searchIcons = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchTerm = query.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from("icon_library")
        .select("id, slug, title, icon_url")
        .not("icon_url", "is", null)
        .or(`title.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
        .limit(24);

      if (error) {
        console.error("Error searching icons:", error);
        return;
      }

      if (data) {
        setSearchResults(data as IconItem[]);
      }
    } catch (e) {
      console.error("Failed to search icons:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

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
      setSelectedIcon(currentIconUrl);
      setEditableName(roomName);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen, fetchRandomIcons, currentIconUrl, roomName]);

  // Generate name for a specific icon
  const generateNameForIcon = async (iconSlug: string) => {
    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-room-name', {
        body: { iconSlug }
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
    await generateNameForIcon(icon.slug);
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

  const displayIcons = searchQuery.trim() ? searchResults : suggestedIcons;
  const isDisplayLoading = searchQuery.trim() ? isSearching : isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg font-display text-foreground">
            აირჩიე აიკონი
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Search input */}
          <div className="relative px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="მოძებნე აიკონი..."
              className="pl-9 pr-9 bg-muted/50 border-border"
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

          {/* Current icon preview with editable name */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="w-16 h-16 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
              {(selectedIcon || currentIconUrl) ? (
                <motion.img
                  key={selectedIcon || currentIconUrl}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={selectedIcon || currentIconUrl || ""}
                  alt=""
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="relative">
                <Input
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  maxLength={35}
                  className="text-base font-semibold pr-8 bg-background h-10"
                  placeholder="ოთახის სახელი"
                  disabled={isGeneratingName}
                />
                {isGeneratingName && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                შეცვალე სახელი ან აირჩიე ახალი აიკონი
              </p>
            </div>
          </div>

          {/* Icons section header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {searchQuery.trim() 
                ? `ძებნის შედეგები (${searchResults.length})` 
                : "შემოთავაზებული"
              }
            </h3>
            {!searchQuery.trim() && (
              <button
                onClick={fetchRandomIcons}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs font-medium text-muted-foreground"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                განახლება
              </button>
            )}
          </div>

          {/* Icons grid - 4x3 */}
          <div className="grid grid-cols-4 gap-2">
            <AnimatePresence mode="popLayout">
              {isDisplayLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="aspect-square rounded-xl bg-muted animate-pulse"
                  />
                ))
              ) : displayIcons.length === 0 && searchQuery.trim() ? (
                <div className="col-span-4 py-8 text-center text-muted-foreground text-sm">
                  აიკონი ვერ მოიძებნა
                </div>
              ) : (
                displayIcons.map((icon, index) => (
                  <motion.button
                    key={icon.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleIconClick(icon)}
                    disabled={isGeneratingName}
                    className={`relative aspect-square rounded-xl bg-muted/50 hover:bg-muted border-2 transition-all flex items-center justify-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedIcon === icon.icon_url
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={icon.icon_url}
                      alt={icon.title}
                      className="w-10 h-10 object-contain"
                      loading="lazy"
                    />
                    {selectedIcon === icon.icon_url && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirmClick}
            disabled={!selectedIcon || !editableName.trim() || isGeneratingName}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              selectedIcon && editableName.trim() && !isGeneratingName
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            არჩევა
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
