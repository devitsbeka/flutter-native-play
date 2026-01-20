import { motion, Reorder } from "framer-motion";
import { Plus, Shuffle, X, GripVertical } from "lucide-react";
import { QueueItem } from "@/hooks/useRoomCategoryQueue";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface CategoryPickerSectionProps {
  categoryName: string | null;
  categoryId: string | null;
  iconSlug?: string | null;
  isHost: boolean;
  queue: QueueItem[];
  onOpenPicker: () => void;
  onRemoveQueueItem?: (itemId: string) => void;
  onReorderQueue?: (newOrder: QueueItem[]) => void;
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
}: CategoryPickerSectionProps) {
  const hasCategory = !!categoryName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => isHost && onOpenPicker()}
      className={`w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6 ${
        isHost ? "cursor-pointer hover:bg-white/15 transition-colors" : ""
      }`}
    >
      {/* Main category display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center overflow-hidden">
            {iconSlug ? (
              <DynamicIcon slug={iconSlug} size={28} />
            ) : (
              <Shuffle className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              {hasCategory ? categoryName : "აირჩიე კატეგორია"}
            </p>
            <p className="text-white/60 text-sm">
              {hasCategory ? "მიმდინარე კატეგორია" : "დააჭირე არჩევისთვის"}
            </p>
          </div>
        </div>
        {isHost && (
          <Plus className="w-5 h-5 text-white/60" />
        )}
      </div>

      {/* Queue preview with drag-to-reorder */}
      {queue.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white/50 text-xs mb-2 font-medium">შემდეგი თამაშები:</p>
          
          {isHost && onReorderQueue ? (
            <Reorder.Group 
              axis="x" 
              values={queue} 
              onReorder={onReorderQueue}
              className="flex gap-2 overflow-x-auto pb-2"
              style={{ touchAction: "pan-y" }}
            >
              {queue.map((item, index) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  layout
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 cursor-grab active:cursor-grabbing select-none touch-none shrink-0"
                  whileDrag={{ scale: 1.1, zIndex: 50, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}
                >
                  <span className="text-white/40 text-xs font-bold mr-0.5">{index + 1}</span>
                  <GripVertical className="w-3 h-3 text-white/40" />
                  {item.icon_slug ? (
                    <DynamicIcon slug={item.icon_slug} size={14} />
                  ) : item.source_type === "random" ? (
                    <Shuffle className="w-3.5 h-3.5 text-white/70" />
                  ) : null}
                  <span className="text-white/80 text-xs font-medium">
                    {item.source_type === "random" 
                      ? "შემთხვევითი" 
                      : item.category_name || "ტრივია"}
                  </span>
                  {onRemoveQueueItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveQueueItem(item.id);
                      }}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <X className="w-3 h-3 text-white/50 hover:text-white/80" />
                    </button>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="flex flex-wrap gap-2">
              {queue.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20"
                >
                  <span className="text-white/40 text-xs font-bold mr-0.5">{index + 1}</span>
                  {item.icon_slug ? (
                    <DynamicIcon slug={item.icon_slug} size={14} />
                  ) : item.source_type === "random" ? (
                    <Shuffle className="w-3.5 h-3.5 text-white/70" />
                  ) : null}
                  <span className="text-white/80 text-xs font-medium">
                    {item.source_type === "random" 
                      ? "შემთხვევითი" 
                      : item.category_name || "ტრივია"}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
