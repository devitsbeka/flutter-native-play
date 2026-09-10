import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { ProPaywallModal } from "@/components/pro/ProPaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { formatFullNumber } from "@/lib/utils";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

/**
 * The coin / gem balance pills (Figma 1102:4980, 1102:4983).
 *
 * Two sizes, because they have two homes. "default" is the Figma size, on
 * the game-mode selection screen's own row (CreateRoomPage), where the pills
 * are the row. "compact" is for the app header, where they share a 76px row
 * with a burger and either a wordmark or a page title: at the full size the
 * pair is 234px of a 358px row, which leaves the title nothing and pushes
 * the home's logo off the end.
 *
 * One component either way — these are the same two numbers, and a second
 * copy of the markup is how the two would drift apart.
 */
const PILL_BASE =
  "flex shrink-0 items-center rounded-[18px] border border-solid border-[#e8e0f5] " +
  "bg-white/60 shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] " +
  "active:translate-y-[1px]";

const SIZES = {
  default: {
    pill: "h-[43px] gap-[4px] pl-[7px] pr-[13px]",
    icon: "h-[32.3px] w-[32.3px]",
    text: "text-[16.16px] leading-[25.13px]",
  },
  compact: {
    pill: "h-[36px] gap-[3px] pl-[5px] pr-[10px]",
    icon: "h-[26px] w-[26px]",
    text: "text-[14px] leading-[20px]",
  },
} as const;

export function BalancePills({
  coins,
  gems,
  onCoinsClick,
  onGemsClick,
  size = "default",
}: {
  coins: number;
  gems: number;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const label = `font-[Nunito] font-black tracking-[-0.146px] text-[#334155] ${s.text}`;
  return (
    <>
      <button type="button" onClick={onCoinsClick} className={`${PILL_BASE} ${s.pill}`}>
        <img alt="" src={coinIcon} className={`${s.icon} object-contain`} />
        <span className={label}>{formatFullNumber(coins)}</span>
      </button>
      <button type="button" onClick={onGemsClick} className={`${PILL_BASE} ${s.pill}`}>
        <img alt="" src={gemIcon} className={`${s.icon} object-contain`} />
        <span className={label}>{formatFullNumber(gems)}</span>
      </button>
    </>
  );
}

export default BalancePills;

/**
 * The green PRO button at the right end of the balance row — 1102:2121's
 * pill, the one the game chooser already wears beside these pills.
 *
 * What it says is who is looking: a player without PRO is asked to try it,
 * a solo PRO is offered the step up to PRO+, and a PRO+ player has nothing
 * left to be sold on this row, so the button is not there (owner: "if user
 * is non pro sees Try PRO or solo pro sees Upgrade"). Either tap opens the
 * paywall, which lists the PRO+ plan for the one who already has PRO.
 */
export function proCtaLabelKey(isVip: boolean, isProPlus: boolean): "extra.tryProBtn" | "extra.upgradeBtn" | null {
  if (!isVip) return "extra.tryProBtn";
  if (!isProPlus) return "extra.upgradeBtn";
  return null;
}

export function ProCtaButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  const { isVip, isProPlus } = useVipStatus();
  const key = proCtaLabelKey(isVip, isProPlus());
  if (!key) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative ml-auto flex h-[43px] shrink-0 items-center justify-center overflow-hidden rounded-[18.39px] border-[1.5px] border-solid border-[#50d8b8] bg-[linear-gradient(180deg,#88e2ca_0%,#4accad_58%,#31c3a1_100%)] px-[19px] shadow-[0px_4px_0px_0px_#1e8e74,0px_8px_16px_0px_rgba(102,51,153,0.3)] transition-transform active:translate-y-[2px]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.45)]" />
      <span className="font-display text-[18px] font-bold leading-[18px] text-white">{t(key)}</span>
    </button>
  );
}

/**
 * The balance strip as a row of its own, for the main screens that have no
 * profile card to carry the numbers.
 *
 * The home keeps its balances on the profile card. The shop has nowhere like
 * that, so it hangs this under its header (PageHeader's `belowRow`), where it
 * inherits the header's stickiness — but not its surface: the strip brings
 * its own, so it frosts over whatever the page puts behind it (see below).
 *
 * Explore and the rating board carried it too and no longer do. Both are
 * browsing screens rather than spending ones — the numbers are not what you
 * came for — and on both the strip was costing a band of the one thing those
 * pages are: Explore's cover artwork and the rating board's first places.
 * Tapping a balance lands in the shop, which is one tab away on either.
 *
 * The online-game hub is deliberately not one of them either: the friends
 * reel is already on that row there, and two strips under one header is a
 * header nobody can see past.
 *
 * Phones only. From md up the row above has the width for the balances a
 * page wants to show (the shop puts its own pills beside the title there),
 * and a full-width band for two numbers is a waste of a screen that size.
 */
export function BalanceStripRow() {
  const { coins, gems } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Signed out there is no balance to show: both figures are zero, and a
  // strip reading 0 coins / 0 gems under the header of every main screen
  // reads as a broken account rather than as something to top up. It is not
  // an invitation either — the pills navigate into the shop, which will only
  // ask a guest to sign in. Nothing renders until there is an account for
  // the numbers to belong to.
  if (!user) return null;

  // A surface of its own rather than whatever the page happens to put behind
  // it. It used to inherit the header's: opaque wash on the shop and the
  // rating board, bare video on Explore — one strip wearing three
  // backgrounds, which is the same complaint as a header that moves.
  //
  // 80% of the page wash with a blur behind it, so what is under the strip
  // (Explore's cover, the shop's first row on the way past) shows through as
  // frost rather than as a hard band, and a 1px rule on top to part it from
  // the title row. The same three everywhere the strip appears.
  //
  // Padded to px-4 — the header row's own inset — so the coin pill's left
  // edge lines up with the title above it instead of sitting 6px further in.
  //
  // The PRO button sits at the row's right end (ProCtaButton). The paywall it
  // opens is portalled to <body>: this strip is a backdrop-filter surface
  // inside a sticky header, and a `fixed` sheet inside one of those is
  // positioned against the strip rather than the screen.
  return (
    <>
      <div
        className="flex items-center gap-[11px] border-t border-border/30 bg-background/80 px-4 pb-[10px] pt-[8px]
                   backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] md:hidden"
      >
        <BalancePills
          coins={coins}
          gems={gems}
          onCoinsClick={() => navigate("/power-ups?section=coins")}
          onGemsClick={() => navigate("/power-ups?section=gems-lari")}
        />
        <ProCtaButton onClick={() => setPaywallOpen(true)} />
      </div>
      {createPortal(<ProPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />, document.body)}
    </>
  );
}
