import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCompactNumber } from "@/lib/utils";

export function ShopCurrencyBar() {
  const { coins, gems } = useCurrency();

  return (
    <div className="px-[15px] py-3">
      <div className="flex items-center gap-4">
        {/* Coins Balance */}
        <div className="flex items-center gap-2">
          <div 
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <img src={coinIcon} alt="" className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-foreground drop-shadow-sm">{formatCompactNumber(coins)}</span>
        </div>

        {/* Gems Balance */}
        <div className="flex items-center gap-2">
          <div 
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <img src={gemIcon} alt="" className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-foreground drop-shadow-sm">{formatCompactNumber(gems)}</span>
        </div>
      </div>
    </div>
  );
}
