import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import piggyBank from "@/assets/icons/piggy-bank.png";

interface ShopHeaderProps {
  /** The piggy bank — the one action the wallet band carries. */
  onPiggyClick?: () => void;
}

/**
 * Coins and gems, per Figma node 716:346.
 *
 * Pale-pink stroked circles with the counts beside them in Slackey. Numbers
 * are written in full — the design shows 1,531,391 and 5,391, not "1.5M" and
 * "5K"; the shop is where a player decides whether to spend, and a rounded
 * balance is the wrong input for that decision.
 *
 * Its own component because it has two homes. On tablet and desktop it sits
 * beside the shop's title in the page header, where the row is already there
 * and half empty; only a phone is narrow enough to need a band of its own.
 *
 * Sizes are the Figma node's, scaled by 0.68: circle 53 -> 36, icon 38 -> 26,
 * count 20 -> 16. Figma draws this at full size in a band 80px tall, and the
 * band was asked to lose height — shrinking the circles is what pays for that
 * without crowding a count against its icon.
 */
export function WalletPills({ className }: { className?: string }) {
  const { coins, gems } = useCurrency();

  const circle =
    "flex size-[36px] shrink-0 items-center justify-center rounded-full " +
    "border border-[rgba(250,214,255,0.43)] bg-[rgba(250,214,255,0.13)]";
  const count = "truncate font-slackey text-[16px] leading-none text-black";

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={circle}>
          <img src={coinIcon} alt="" className="size-[26px] object-contain" />
        </span>
        <span className={count}>{coins.toLocaleString()}</span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className={circle}>
          <img src={gemIcon} alt="" className="size-[26px] object-contain" />
        </span>
        <span className={count}>{gems.toLocaleString()}</span>
      </div>
    </div>
  );
}

/**
 * The shop's wallet band — phones only.
 *
 * A full-width strip directly under PageHeader, balances at the left and the
 * piggy bank at the right. Above md the same pills ride in the header beside
 * the title instead, so this band would be a second copy of them and a
 * near-empty row besides.
 *
 * Lilac rather than the white it was: Figma paints the panel #FAF1FC over a
 * #FAD8FF top border, which separates it from the header's own white without
 * a shadow doing the work.
 *
 * 56px rather than 76: it carries two numbers and one button, and at the
 * header's full height it read as a second header rather than a strip
 * belonging to the page.
 *
 * What this deliberately does not carry: a second search button, a second
 * bell, and a help button. PageHeader has search and notifications one row
 * above, so the shop was showing both pairs.
 */
export function ShopHeader({ onPiggyClick }: ShopHeaderProps) {
  return (
    <div className="w-full border-t border-[#FAD8FF] bg-[#FAF1FC] md:hidden">
      <div className="mx-auto flex h-[56px] w-full max-w-[700px] items-center gap-4 px-5">
        <WalletPills />

        {/* Piggy bank — buy more. Closes the row on the right, facing the
            balances it feeds (the export already looks left). */}
        <button
          type="button"
          onClick={onPiggyClick}
          aria-label="Buy currency"
          className="ml-auto shrink-0 transition-transform active:scale-95"
        >
          <img src={piggyBank} alt="" className="size-[46px] object-contain" />
        </button>
      </div>
    </div>
  );
}
