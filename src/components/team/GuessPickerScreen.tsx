/**
 * "What will you guess?" — the picture games, on a screen of their own
 * (Figma 1059:8).
 *
 * The Guess card is the one mode that asks a question back instead of
 * starting something, and the answer used to unfold as a strip of small
 * tiles UNDER the card that asked it: three to a row, half of them below
 * the fold, wedged between the carousel and the Create button. The design
 * gives the question the screen instead — the title, then the games two to
 * a row at the size the art was drawn for, and nothing else on the page.
 *
 * The corners are the design's own: within a full 2×2 block each card
 * rounds its INNER corner to 54, so the four together read as one petal.
 * A card with no block to belong to — the fifth of five — keeps 24 all
 * round, which is what the design shows and why the rule below is written
 * per complete block rather than per position.
 */

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { cn } from "@/lib/utils";

export interface GuessCategory {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

/**
 * The inner corner of a complete 2×2 block, by position within it:
 * top-left rounds its bottom-right, top-right its bottom-left, and the
 * two beneath them their tops. Shorthand order is TL TR BR BL.
 */
const PETAL_RADII = [
  "rounded-[24px_24px_54px_24px]",
  "rounded-[24px_24px_24px_54px]",
  "rounded-[24px_54px_24px_24px]",
  "rounded-[54px_24px_24px_24px]",
] as const;

function cardRadius(index: number, total: number) {
  const blockStart = Math.floor(index / 4) * 4;
  // Only a block of four petals into anything; a short last block is plain.
  if (blockStart + 4 > total) return "rounded-[24px]";
  return PETAL_RADII[index - blockStart];
}

export function GuessPickerScreen({
  title,
  categories,
  onPick,
  busyCategoryId,
  disabled,
}: {
  title: string;
  categories: GuessCategory[];
  onPick: (category: GuessCategory) => void;
  /** The tile whose room is being created — the tap has to say something. */
  busyCategoryId?: string | null;
  disabled?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col px-4 py-3 md:max-w-[520px]">
      <h2 className="shrink-0 pb-[13px] pt-[7px] font-[Nunito] text-[24px] leading-[28px] tracking-[-0.3px] text-[#3a2260]">
        {title}
      </h2>

      {categories.length === 0 ? (
        <div className="mt-[26px] flex h-[167px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#3a2260]/50" />
        </div>
      ) : (
        <div className="mt-[26px] grid grid-cols-2 gap-x-[14px] gap-y-[20px]">
          {categories.map((cat, i) => {
            const busy = busyCategoryId === cat.category_id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileTap={disabled ? undefined : { scale: 0.97 }}
                disabled={disabled}
                onClick={() => onPick(cat)}
                className={cn(
                  "relative flex h-[167px] flex-col items-center justify-center gap-[10px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_24px_0px_rgba(102,51,153,0.12)] transition-opacity",
                  cardRadius(i, categories.length),
                  disabled && !busy && "opacity-60",
                )}
              >
                {/* The designed box is 82 wide by 96 tall with the art
                    contained inside it: a square render centred, 82 across.
                    CategoryArtwork draws square, so the box carries the
                    height and the art the width — the same geometry, not a
                    stretched one. */}
                <span className="flex h-[96px] w-[82px] items-center justify-center">
                  {busy ? (
                    <Loader2 className="h-8 w-8 animate-spin text-[#3a2260]/60" />
                  ) : (
                    <CategoryArtwork
                      categoryId={cat.category_id}
                      iconSlug={cat.icon_slug}
                      size={82}
                      // No cast shadow here. CategoryArtwork carries one for the
                      // dark scrims it usually sits on; against this card it is a
                      // grey smudge the design does not draw, and the art already
                      // has its own shadow baked in.
                      className="drop-shadow-none"
                    />
                  )}
                </span>
                <span className="max-w-[170px] text-center font-[Nunito] text-[14px] font-medium leading-[14.375px] tracking-[-0.16px] text-[#373d47]">
                  {cat.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
