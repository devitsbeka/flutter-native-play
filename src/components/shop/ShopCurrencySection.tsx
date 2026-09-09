import { motion } from "framer-motion";
import { ShopItem } from "@/hooks/useShopData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStorePrice } from "@/hooks/useStorePrice";
import { GEM_PACK_PRODUCTS } from "@/config/gemPacks";
import gemIcon from "@/assets/icons/icon-gem.webp";
import coinIcon from "@/assets/icons/icon-coin.webp";
import { CurrencyBackdrop } from "./CurrencyBackdrop";
import type { CurrencySectionId } from "./currencySections";

interface ShopCurrencySectionProps {
  sectionId: CurrencySectionId;
  title: string;
  items: ShopItem[];
  /** The player's gem balance — what the coin packs are paid for out of. */
  gems: number;
  isPurchasing: string | null;
  onItemClick: (item: ShopItem) => void;
}

/**
 * Coins and gems, as one product with four sizes.
 *
 * Both shelves used to be four full ShopItemCards, and every card repeated
 * the same icon and its own sentence of description — four pictures of a
 * coin, four explanations of what coins are, and the actual difference
 * between them (the amount) rendered at the same weight as the noise. It
 * read as four unrelated products and was the most cluttered part of the
 * shop.
 *
 * So: one card carries the identity — what this currency is, in a few words
 * — and beneath it the four sizes are compact tiles whose headline is the
 * only thing that actually varies. The price sits inside each tile's button,
 * because the amount and what it costs are the whole decision.
 */
export function ShopCurrencySection({
  sectionId,
  title,
  items,
  gems,
  isPurchasing,
  onItemClick,
}: ShopCurrencySectionProps) {
  const { t } = useLanguage();
  // A hook returning a lookup, so it is resolved once here and applied per
  // item below — unlike calling the hook itself, which a map cannot do.
  const storePrice = useStorePrice();

  const isGems = sectionId === "gems-lari";
  const headlineIcon = isGems ? gemIcon : coinIcon;
  const blurb = t(isGems ? "shop.gemsWhat" : "shop.coinsWhat");

  return (
    <motion.section
      className="mx-3 sm:mx-4 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* relative z-10 lifts the text above GlobalSplineBackground's blobs,
          which otherwise paint over plain text and swallow the titles. */}
      <div className="relative z-10 mb-3 mt-2 flex items-center gap-2.5 px-1">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{title}</h2>
      </div>

      {/* One card holds the whole shelf: the identity line at its head, the
          four sizes nested inside it. Separate boxes read as a caption that
          had come loose from what it captioned — this way the four are
          visibly the same product, and the section is one object on the page
          rather than five. */}
      <div
        className={`currency-shelf rounded-[24px] p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.06),0_10px_24px_rgba(60,30,90,0.10)] ${
          isGems ? "shelf-gems" : "shelf-coins"
        }`}
      >
        <CurrencyBackdrop variant={isGems ? "gems" : "coins"} />

        <div className="currency-shelf__content">
        <div className="flex items-center gap-4 px-1 pb-1 pt-1">
          <img src={headlineIcon} alt="" className="h-14 w-14 shrink-0 object-contain" />
          <div className="min-w-0">
            <h3 className="text-[20px] font-bold leading-tight text-gray-900">{title}</h3>
            <p className="mt-1 text-[15.5px] leading-snug text-gray-600">{blurb}</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const isLari = item.currency === "lari";
          const lariPrice = isLari
            ? storePrice(GEM_PACK_PRODUCTS[item.id] ?? item.id, item.price)
            : null;
          // Same rule the full cards follow: until the store answers there is
          // no price, and nothing without a price may be sold.
          const storeUnavailable = !!lariPrice && !lariPrice.sellable;
          const canAfford = isLari || gems >= item.price;
          const isLoading = isPurchasing === item.id;
          const disabled = isLoading || storeUnavailable;

          // The amount is the only thing that differs between these four, so
          // it is the headline. `value` is the raw number of coins/gems;
          // `name` already reads "500 Coin" and is the fallback.
          const headline = item.value != null ? item.value.toLocaleString() : item.name;

          return (
            <div key={item.id} className="relative pt-2.5">
              {!!item.savings && (
                <div
                  className="absolute left-2 top-0 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-900"
                  style={{
                    background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
                    boxShadow: "0 2px 0 hsl(40 80% 45%)",
                  }}
                >
                  -{item.savings}%
                </div>
              )}

              <div
                // A plain tinted surface, not a second liquid-glass: glass
                // inside glass doubles the blur and the inner tiles turn to
                // milk against the card they sit on.
                className={`flex h-full flex-col items-center gap-2 rounded-[20px] border border-white/70 px-3 py-4 text-center backdrop-blur-[2px] ${
                  canAfford && !storeUnavailable ? "bg-white/70" : "bg-white/40"
                }`}
              >
                <img src={headlineIcon} alt="" className="h-8 w-8 shrink-0 object-contain" />
                <span className="text-[21px] font-bold leading-none text-gray-900">{headline}</span>

                {storeUnavailable ? (
                  // Say so rather than offering a button that cannot complete
                  // the purchase — the same guard the full cards carry.
                  <p className="mt-1 px-1 text-[11px] leading-snug text-muted-foreground">
                    {t("extra.iapItemUnavailable")}
                  </p>
                ) : (
                  <motion.button
                    onClick={() => !disabled && onItemClick(item)}
                    disabled={disabled}
                    aria-label={`${t("shop.buy")} ${item.name}`}
                    className="mt-1 flex w-full min-w-[92px] items-center justify-center gap-1.5 rounded-full px-5 py-3 font-bold text-[#402666] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
                      boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 #FFFFFF",
                      border: "2px solid #E8E0F5",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95, y: 2 }}
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#402666] border-t-transparent" />
                    ) : isLari ? (
                      <span className="text-[15px]">{lariPrice!.display}</span>
                    ) : (
                      <>
                        <img src={gemIcon} alt="" className="h-5 w-5 shrink-0" />
                        <span className="text-[15px]">{item.price}</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
            );
          })}
        </div>
        </div>
      </div>
    </motion.section>
  );
}
