import { motion, Reorder, useDragControls } from "framer-motion";
import { Plus, Shuffle, X, GripVertical, Library, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { QueueItem } from "@/hooks/useRoomCategoryQueue";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";

interface CategoryPickerSectionProps {
  categoryName: string | null;
  categoryId: string | null;
  iconSlug?: string | null;
  isHost: boolean;
  queue: QueueItem[];
  onOpenPicker: () => void;
  onRemoveQueueItem?: (itemId: string) => void;
  onReorderQueue?: (newOrder: QueueItem[]) => void;
  isAlreadyPlayed?: boolean;
  willBeObserver?: boolean;
}

// Separate component to use useDragControls hook per item
function DraggableQueueItem({
  item,
  index,
  hasCategory,
  onRemoveQueueItem,
}: {
  item: QueueItem;
  index: number;
  hasCategory: boolean;
  onRemoveQueueItem?: (id: string) => void;
}) {
  const dragControls = useDragControls();
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      layout
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 border border-white/20 shrink-0 h-9"
      whileDrag={{ scale: 1.1, zIndex: 50, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}
    >
      <span className="text-white/40 text-xs font-bold mr-0.5">
        {hasCategory ? index + 2 : index + 1}
      </span>
      
      {/* Drag handle - ONLY this triggers drag */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-[18px] h-[18px] text-white/40" />
      </div>
      
      {item.category_id === "__mixed__" ? (
        <DynamicIcon slug="mystery-box" size={18} />
      ) : item.source_type === "random" ? (
        <Shuffle className="w-[18px] h-[18px] text-purple-400" />
      ) : item.source_type === "category" ? (
        <Library className="w-[18px] h-[18px] text-purple-400" />
      ) : (
        <Sparkles className="w-[18px] h-[18px] text-purple-400" />
      )}
      <span className="text-white/80 text-xs font-medium">
        {item.source_type === "random" 
          ? t("extra.cpRandomTitle")
          : localizeCategory(item.category_name) || "Trivia"}
      </span>
      {onRemoveQueueItem && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemoveQueueItem(item.id);
          }}
          className="ml-0.5 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-[18px] h-[18px] text-white/50 hover:text-white/80" />
        </button>
      )}
    </Reorder.Item>
  );
}

export function CategoryPickerSection({
  categoryName,
  categoryId,
  iconSlug,
  isHost,
  queue,
  onOpenPicker,
  onRemoveQueueItem,
  onReorderQueue,
  isAlreadyPlayed,
  willBeObserver,
}: CategoryPickerSectionProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const hasCategory = !!categoryName;
  const showQueuePreview = queue.length > 0;
  const currentPillType: "random" | "category" | "user_trivia" | null = !hasCategory
    ? null
    : categoryName === t("extra.cpRandomTitle")
      ? "random"
      : categoryId
        ? "category"
        : "user_trivia";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => isHost && onOpenPicker()}
      className={`w-full p-4 rounded-2xl bg-white/10 border border-white/[0.12] mb-6 ${
        isHost ? "cursor-pointer hover:bg-white/15 transition-colors" : ""
      }`}
    >
      {/* Main category display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center overflow-hidden">
            {categoryId === "__mixed__" ? (
              <DynamicIcon slug="mystery-box" size={24} />
            ) : categoryName === t("extra.cpRandomTitle") || !categoryName ? (
              <Shuffle className="w-6 h-6 text-purple-400" />
            ) : categoryId ? (
              <Library className="w-6 h-6 text-purple-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn(
                "text-white font-semibold leading-tight truncate",
                hasCategory ? "text-[19.8px]" : "text-[15.4px]"
              )}>
                {hasCategory ? localizeCategory(categoryName) : (isHost ? t("extra.cpsWhatToPlay") : t("extra.cpsCurrentCategory"))}
              </p>
              {isAlreadyPlayed && hasCategory && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">
                  {t("extra.cpsAlreadyPlayed")}
                </span>
              )}
              {willBeObserver && hasCategory && !isAlreadyPlayed && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
                  👁️ {t("extra.cpsObserver")}
                </span>
              )}
            </div>
            <p className={cn(
              "leading-snug",
              hasCategory ? "text-white/60 text-[16.1px]" : "text-white/60 text-[13.8px]"
            )}>
              {isAlreadyPlayed && hasCategory
                ? t("extra.cpsChooseNew")
                : hasCategory 
                  ? t("extra.cpsCurrent")
                  : (isHost ? t("extra.cpsAddCategory") : t("extra.cpsNotChosen"))}
            </p>
          </div>
        </div>
        {isHost && (
          <div className="w-10 h-10 rounded-xl border border-dashed border-white/40 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-white/60" />
          </div>
        )}
      </div>

      {/* Queue preview with drag-to-reorder - UNIFIED SINGLE ROW */}
      {showQueuePreview && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white/50 text-xs mb-2 font-medium">{t("extra.cpsQueueLabel")}</p>

          {/* Queue pills - draggable for host, static for others */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {isHost && onReorderQueue ? (
              <Reorder.Group 
                axis="x" 
                values={queue} 
                onReorder={onReorderQueue}
                className="flex gap-2"
              >
                {queue.map((item, index) => (
                  <DraggableQueueItem
                    key={item.id}
                    item={item}
                    index={index}
                    hasCategory={hasCategory}
                    onRemoveQueueItem={onRemoveQueueItem}
                  />
                ))}
              </Reorder.Group>
            ) : (
              queue.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 border border-white/20 shrink-0 h-9"
                >
                  <span className="text-white/40 text-xs font-bold mr-0.5">{hasCategory ? index + 2 : index + 1}</span>
                  {item.category_id === "__mixed__" ? (
                    <DynamicIcon slug="mystery-box" size={18} />
                  ) : item.source_type === "random" ? (
                    <Shuffle className="w-[18px] h-[18px] text-purple-400" />
                  ) : item.source_type === "category" ? (
                    <Library className="w-[18px] h-[18px] text-purple-400" />
                  ) : (
                    <Sparkles className="w-[18px] h-[18px] text-purple-400" />
                  )}
                  <span className="text-white/80 text-xs font-medium">
                    {item.source_type === "random" 
                      ? t("extra.cpRandomTitle")
                      : localizeCategory(item.category_name) || "Trivia"}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
