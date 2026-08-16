import { useCurrency } from "@/hooks/useCurrency";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import piggyBank from "@/assets/icons/piggy-bank.png";

interface ShopHeaderProps {
  /** The piggy bank — the one action the wallet band carries. */
  onPiggyClick?: () => void;
}

/**
 * The shop's wallet band, per Figma node 716:346.
 *
 * A full-width white strip directly under PageHeader: coins and gems in
 * pale-pink stroked circles with the counts beside them in Slackey, and a
 * piggy bank on the right that leads to buying more. Numbers are written in
 * full — the design shows 1,531,391 and 5,391, not "1.5M" and "5K"; the shop
 * is where a player decides whether to spend, and a rounded balance is the
 * wrong input for that decision.
 *
 * What the old version had that this deliberately does not: a second search
 * button, a second bell, and a help button. PageHeader already carries
 * search and notifications one row above, so the shop page was showing both
 * pairs — the design has neither.
 */
export function ShopHeader({ onPiggyClick }: ShopHeaderProps) {
  const { coins, gems } = useCurrency();

  return (
    <div
      className="w-full bg-white border-t border-[#EFE9F7]"
      style={{ boxShadow: "0 6px 16px rgba(64, 38, 102, 0.10)" }}
    >
      <div className="mx-auto flex w-full max-w-[700px] items-center gap-4 px-5 py-3">
        {/* Coins */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-[53px] shrink-0 items-center justify-center rounded-full border border-[rgba(250,214,255,0.43)] bg-[rgba(250,214,255,0.13)]">
            <img src={coinIcon} alt="" className="size-[38px] object-contain" />
          </span>
          <span className="truncate font-slackey text-[20px] leading-none text-black">
            {coins.toLocaleString()}
          </span>
        </div>

        {/* Gems */}
        <div className="ml-3 flex min-w-0 items-center gap-2.5">
          <span className="flex size-[53px] shrink-0 items-center justify-center rounded-full border border-[rgba(250,214,255,0.43)] bg-[rgba(250,214,255,0.13)]">
            <img src={gemIcon} alt="" className="size-[38px] object-contain" />
          </span>
          <span className="truncate font-slackey text-[20px] leading-none text-black">
            {gems.toLocaleString()}
          </span>
        </div>

        {/* Piggy bank — buy more. Pushed to the far edge by the design's own
            layout: wallet group flexes, the piggy does not. */}
        <button
          type="button"
          onClick={onPiggyClick}
          aria-label="Buy currency"
          className="ml-auto shrink-0 active:scale-95 transition-transform"
        >
          <img src={piggyBank} alt="" className="size-[72px] object-contain" />
        </button>
      </div>
    </div>
  );
}
