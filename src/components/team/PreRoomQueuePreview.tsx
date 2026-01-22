import { motion } from "framer-motion";
import { Library, Shuffle, Sparkles, X } from "lucide-react";

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
  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-white/60 text-xs font-medium">შემდეგი რაუნდები (ლობის წინ)</p>
          <p className="text-white text-sm font-semibold">{items.length} დამატებულია</p>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-white/60 text-xs hover:text-white/80 transition-colors"
          >
            გასუფთავება
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 border border-white/20 shrink-0"
          >
            <span className="text-white/40 text-xs font-bold mr-0.5">{index + 1}</span>

            {item.source_type === "random" ? (
              <Shuffle className="w-[18px] h-[18px] text-purple-400" />
            ) : item.source_type === "category" ? (
              <Library className="w-[18px] h-[18px] text-purple-400" />
            ) : (
              <Sparkles className="w-[18px] h-[18px] text-purple-400" />
            )}

            <span className="text-white/80 text-xs font-medium">
              {item.source_type === "random" ? "შემთხვევითი" : item.category_name || "ტრივია"}
            </span>

            <button
              type="button"
              onClick={() => onRemove(item.tmpId)}
              className="ml-0.5 p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="რაუნდის წაშლა"
            >
              <X className="w-[18px] h-[18px] text-white/50 hover:text-white/80" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
