import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  onSelectIcon: (iconUrl: string) => void;
}

export function RoomIconPickerModal({
  isOpen,
  onClose,
  currentIconUrl,
  roomName,
  onSelectIcon,
}: RoomIconPickerModalProps) {
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // Fetch random icons from database
  const fetchRandomIcons = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get total count first
      const { count } = await supabase
        .from("icon_library")
        .select("*", { count: "exact", head: true })
        .not("icon_url", "is", null);

      if (!count || count === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch a random subset - get 50 and shuffle client-side
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
        // Shuffle and take 12
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setSuggestedIcons(shuffled.slice(0, 12) as IconItem[]);
      }
    } catch (e) {
      console.error("Failed to fetch icons:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load icons when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRandomIcons();
      setSelectedIcon(null);
    }
  }, [isOpen, fetchRandomIcons]);

  const handleIconClick = (icon: IconItem) => {
    setSelectedIcon(icon.icon_url);
  };

  const handleConfirm = () => {
    if (selectedIcon) {
      onSelectIcon(selectedIcon);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg font-display text-foreground">
            აირჩიე აიკონი
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Current icon preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="w-16 h-16 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{roomName}</p>
              <p className="text-xs text-muted-foreground">
                {selectedIcon ? "ახალი აიკონი არჩეულია" : "მიმდინარე აიკონი"}
              </p>
            </div>
            {selectedIcon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            )}
          </div>

          {/* Suggested icons header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              შემოთავაზებული
            </h3>
            <button
              onClick={fetchRandomIcons}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs font-medium text-muted-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              განახლება
            </button>
          </div>

          {/* Icons grid - 4x3 */}
          <div className="grid grid-cols-4 gap-2">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="aspect-square rounded-xl bg-muted animate-pulse"
                  />
                ))
              ) : (
                suggestedIcons.map((icon, index) => (
                  <motion.button
                    key={icon.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleIconClick(icon)}
                    className={`relative aspect-square rounded-xl bg-muted/50 hover:bg-muted border-2 transition-all flex items-center justify-center overflow-hidden ${
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
            onClick={handleConfirm}
            disabled={!selectedIcon}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              selectedIcon
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
