import { motion } from "framer-motion";
import { Check } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.webp";
import coinIcon from "@/assets/icons/icon-coin.webp";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStorePrice } from "@/hooks/useStorePrice";
import { GEM_PACK_PRODUCTS } from "@/config/gemPacks";

export type ShopItemBadge = "popular" | "best-value" | "limited" | "new" | null;
export type ShopItemCurrency = "gems" | "coins" | "lari";

export interface ShopItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: ShopItemCurrency;
  icon: React.ReactNode;
  gradient: string;
  badge?: ShopItemBadge;
  savings?: number;
  /** Fill the card with its gradient (hero bundles) instead of the neutral surface. */
  vibrant?: boolean;
  isPurchased?: boolean;
  isLoading?: boolean;
  canAfford?: boolean;
  index?: number;
  showDescription?: boolean;
  /** Full-row horizontal card — used when a section's odd last item stretches across the row. */
  featured?: boolean;
  onClick: () => void;
}

export function ShopItemCard({
  id,
  name,
  description,
  price,
  currency,
  icon,
  gradient,
  badge,
  savings,
  vibrant = false,
  isPurchased = false,
  isLoading = false,
  canAfford = true,
  showDescription = true,
  featured = false,
  onClick,
}: ShopItemCardProps) {
  const { t } = useLanguage();
  const currencyIcon = currency === "gems" ? gemIcon : currency === "coins" ? coinIcon : null;
  const isLari = currency === "lari";
  // Real-money items must show StoreKit's own price on iOS, not the USD figure
  // in the catalog run through utils/currency's hardcoded 2.75 GEL rate. A
  // Georgian player was being quoted "2.72 ₾" for a $0.99 pack: a number Apple
  // never charges, on the card they tap to buy, which is guideline 2.3.1.
  //
  // Nothing is converted any more, and on a phone there is no fallback figure
  // either: until StoreKit answers there is no price, and the card says so.
  const storePrice = useStorePrice();
  // Resolved once, and its `sellable` flag decides whether this card may carry
  // a live Buy button at all.
  //
  // It could not before: the price line rendered whatever `display` said —
  // including the "—" placeholder StoreKit leaves behind when it has not
  // answered — while the button's only disabled conditions were `isPurchased`
  // and `isLoading`, and `canAfford` is hardcoded true for real-money items in
  // ShopProductGrid. So on an App Review device, where StoreKit routinely
  // returns nothing, every gem pack showed an em dash beside a live, undimmed
  // Buy button, and tapping it produced an "item unavailable" toast. That is a
  // 2.1 rejection (a purchase that cannot complete) and a 3.1.1 one (a price
  // that is not a price) on the same tap.
  //
  // The subscription paywalls already refuse to sell in this state, through
  // their own `storeReady` guard; this is the same rule for consumables.
  const lariPrice = isLari ? storePrice(GEM_PACK_PRODUCTS[id] ?? id, price) : null;
  const storeUnavailable = !!lariPrice && !lariPrice.sellable;
  // Nothing that cannot be bought should look buyable, so an unreachable store
  // dims the card exactly the way an unaffordable price does.
  const purchasable = canAfford && !storeUnavailable;
  // Hero bundles opt in to their own gradient fill so they stand apart from
  // the regular lavender-white content cards; white text rides on top of it.
  const hasGradient = vibrant && !!gradient && gradient !== "transparent";
  // The gradient only actually paints on an affordable, unpurchased card —
  // otherwise the background falls back to muted/green, so light-on-dark
  // text and vibrant borders must not be used (white-on-gray bug).
  const gradientActive = hasGradient && !isPurchased && purchasable;

  // Shared by both the vertical and the featured horizontal layout
  const actionBlock = isPurchased ? (
    <div className="flex items-center justify-center gap-1 text-success font-bold text-sm px-4 py-2 rounded-full bg-success/10">
      <Check className="w-5 h-5" />
      <span>{t("common.owned")}</span>
    </div>
  ) : isLoading ? (
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  ) : storeUnavailable ? (
    // Say so, rather than showing an em dash above a button that fails. The
    // copy already exists in every locale — it is the toast the failed tap
    // used to produce, moved to where it stops the tap from happening.
    <p className="px-1 text-center text-[11px] leading-snug text-muted-foreground">
      {t("extra.iapItemUnavailable")}
    </p>
  ) : (
    // The price rides INSIDE the button rather than on a line above it. Two
    // separate things — a figure, then a button reading "Buy" — asked the
    // reader to join them up, and on a two-across grid the pair ate the
    // height that the pack name and its line needed. One control now says
    // what it costs and does the buying, at roughly twice the old footprint
    // so it is the obvious target on the card.
    <motion.button
      onClick={onClick}
      // storeUnavailable is already handled above, where the whole block is
      // replaced — repeated here so the one condition that must never let a
      // purchase start is stated on the control that starts it.
      disabled={isPurchased || isLoading || storeUnavailable}
      aria-label={`${t('shop.buy')} ${name}`}
      className="flex min-w-[100px] items-center justify-center gap-1.5 rounded-full px-6 py-3 font-bold text-[#402666]"
      // White chunky pill, same recipe as the main page stat pills
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
        boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 #FFFFFF",
        border: "2px solid #E8E0F5",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 2 }}
    >
      {isLari ? (
        <span className="text-[15px] sm:text-base">{lariPrice!.display}</span>
      ) : (
        <>
          <img src={currencyIcon!} alt="" width={24} height={24} loading="lazy" decoding="async" className="h-5 w-5 shrink-0" />
          <span className="text-[15px] sm:text-base">{price}</span>
        </>
      )}
    </motion.button>
  );

  if (featured) {
    return (
      <div className="relative pt-3">
        {savings && !isPurchased && (
          <div
            className="absolute top-0 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
            style={{
              background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
              boxShadow: "0 2px 0 hsl(40 80% 45%)",
            }}
          >
            -{savings}%
          </div>
        )}

        <div
          className={cn(
            "w-full rounded-[24px] transition-all relative overflow-hidden flex items-center gap-4 text-left",
            "px-4 sm:px-6 py-5",
            // Full-row widgets (deals, bundles, VIP month...) share one height
            "min-h-[250px]",
            !isPurchased && purchasable && !hasGradient && "liquid-glass"
          )}
          style={{
            background: isPurchased
              ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
              : !purchasable
              ? "hsl(var(--muted))"
              : hasGradient
              ? gradient
              : undefined,
            boxShadow: isPurchased
              ? "0 4px 0 hsl(145 60% 70%)"
              : !purchasable
              ? "0 3px 0 hsl(var(--border))"
              : hasGradient
              ? "0 3.6px 0 0 rgba(0,0,0,0.22), inset 0 1.8px 0 0 rgba(255,255,255,0.35)"
              : undefined,
            border: isPurchased
              ? "2px solid hsl(145 70% 50%)"
              : gradientActive
              ? "1.5px solid rgba(255,255,255,0.35)"
              : undefined,
          }}
        >
          <div className={cn("shrink-0 flex items-center justify-center", hasGradient ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20")}>
            <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full drop-shadow-md">
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-bold leading-tight mb-0.5", gradientActive ? "text-white drop-shadow-sm text-[17px] sm:text-[19px]" : "text-gray-900 text-[16px] sm:text-[18px]")}>{name}</h3>
            {showDescription && description && (
              <p className={cn("text-[15px] sm:text-[16px] leading-snug line-clamp-2", gradientActive ? "text-white/90" : "text-gray-600")}>{description}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1.5">{actionBlock}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative pt-3"
      // Skip offscreen rendering work while scrolling long shop lists
      style={{ contentVisibility: "auto", containIntrinsicSize: "250px" } as React.CSSProperties}
    >
      {/* Savings Badge - positioned on left */}
      {savings && !isPurchased && (
        <div
          className="absolute top-0 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 z-10"
          style={{
            background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
            boxShadow: "0 2px 0 hsl(40 80% 45%)",
          }}
        >
          -{savings}%
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-[24px] transition-all relative overflow-hidden flex flex-col items-center text-center",
          "px-2.5 sm:px-3 p-3",
          "h-[232px] sm:h-[246px]",
          !isPurchased && purchasable && !hasGradient && "liquid-glass"
        )}
        style={{
          background: isPurchased
            ? "linear-gradient(180deg, hsl(150 70% 92%) 0%, hsl(145 65% 85%) 100%)"
            : !purchasable
            ? "hsl(var(--muted))"
            : hasGradient
            ? gradient
            : undefined,
          boxShadow: isPurchased
            ? "0 4px 0 hsl(145 60% 70%)"
            : !purchasable
            ? "0 3px 0 hsl(var(--border))"
            : hasGradient
            ? "0 3.6px 0 0 rgba(0,0,0,0.22), inset 0 1.8px 0 0 rgba(255,255,255,0.35)"
            : undefined,
          border: isPurchased
            ? "2px solid hsl(145 70% 50%)"
            : gradientActive
            ? "1.5px solid rgba(255,255,255,0.35)"
            : undefined,
        }}
      >
        {/* Icon - Top */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center mb-1">
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>

        {/* Name */}
        <h3 className={cn("font-bold text-[17px] sm:text-[19px] leading-tight mb-0.5", gradientActive ? "text-white drop-shadow-sm" : "text-gray-900")}>{name}</h3>

        {/* Description - flex-1 to push price section to bottom */}
        {showDescription && description && (
          <div className="flex-1 flex items-start">
            <p className={cn("text-[15px] sm:text-[16px] leading-snug line-clamp-2 w-full", gradientActive ? "text-white/90" : "text-gray-600")}>{description}</p>
          </div>
        )}

        {/* Price / Status - Bottom (buy button is the only clickable part) */}
        <div className="mt-auto mb-2.5 w-full flex flex-col items-center gap-0.5">{actionBlock}</div>
      </div>
    </div>
  );
}
