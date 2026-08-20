import { motion } from "framer-motion";
import { Library, Shuffle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";

export type PreRoomQueuePreviewItem = {
  tmpId: string;
  source_type: "category" | "random" | "user_trivia";
  category_name?: string | null;
};

interface PreRoomQueuePreviewProps {
  items: PreRoomQueuePreviewItem[];
  onRemove: (tmpId: string) => void;
  onClear?: () => void;
}

export function PreRoomQueuePreview({ items, onRemove, onClear }: PreRoomQueuePreviewProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-muted/50 border border-border/50 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium">{t("extra.nextRoundsPreLobby")}</p>
          <p className="text-foreground text-sm font-semibold">{t("extra.addedCount", { count: items.length })}</p>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground text-xs hover:text-foreground transition-colors"
          >
            {t("extra.clearAll")}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {items.map((item, index) => (
          <motion.div
            key={item.tmpId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/60 border border-border/50 shrink-0"
          >
            <span className="text-muted-foreground text-xs font-bold mr-0.5">{index + 1}</span>

            {item.source_type === "random" ? (
              <Shuffle className="w-[18px] h-[18px] text-primary" />
            ) : item.source_type === "category" ? (
              <Library className="w-[18px] h-[18px] text-primary" />
            ) : (
              <Sparkles className="w-[18px] h-[18px] text-primary" />
            )}

            <span className="text-foreground text-xs font-medium">
              {item.source_type === "random" ? t("extra.randomOption") : localizeCategory(item.category_name) || t("extra.trivia")}
            </span>

            <button
              type="button"
              onClick={() => onRemove(item.tmpId)}
              className="ml-0.5 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label={t("extra.removeRound")}
            >
              <X className={cn("w-[18px] h-[18px]", "text-muted-foreground hover:text-foreground")} />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
