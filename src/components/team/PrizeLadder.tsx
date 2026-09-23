import coinIcon from "@/assets/tb-lobby/coin.png";
import { prizeLadderLines } from "@/utils/roomPrizes";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * A room's prizes, a place to a row, each with its own coin.
 *
 * The ladder as one line ("1st 200 · 2nd 100 · 3rd 50") does not fit half a
 * sheet's width: it wrapped mid-ladder, left the dots dangling at line ends
 * and hung one coin beside three lines. The summary, preview and rematch
 * sheets all draw this tile, so they draw it here.
 */
export function PrizeLadder({ t, players }: { t: Translate; players?: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      {prizeLadderLines(t, players).map((line) => (
        <p key={line} className="flex items-center gap-1.5 font-display text-[15px] font-bold leading-6 text-[#402666]">
          <img src={coinIcon} alt="" className="h-4 w-4 shrink-0 object-contain" />
          {line}
        </p>
      ))}
    </div>
  );
}
