import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

/**
 * Coins and gems, per Figma node 716:346.
 *
 * Pale-pink stroked circles with the counts beside them. Numbers
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
  // Nunito Black in slate, the same face the home page sets its coin and gem
  // pills in — this row is the same information in a different place, and it
  // was reading in Slackey against Nunito everywhere else.
  const count =
    "truncate font-['Nunito'] text-[16px] font-black leading-none " +
    "tracking-[-0.1462px] text-[#334155]";

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
