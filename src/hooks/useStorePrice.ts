import { Capacitor } from "@capacitor/core";
import { useInAppPurchases, IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import { getPriceDisplay } from "@/utils/currency";

/**
 * The price to show on a paywall.
 *
 * On the web, the hardcoded USD figure converted for display, as before.
 *
 * On iOS it has to be **StoreKit's own localized price string**, not a number
 * from the bundle. Apple sets the price from the tier chosen in App Store
 * Connect and renders it in the storefront's currency — a Georgian user sees
 * ₾, a German user sees €, and neither matches a `$3.99` compiled into the
 * app. Showing one price and charging another is a metadata rejection under
 * guideline 2.3.1, and it is the kind of thing review checks by simply
 * looking at the screen.
 *
 * RevenueCat hands back `priceString` already formatted for the storefront,
 * so the correct thing to display is whatever it says.
 *
 * Falls back to the hardcoded figure when the store has not answered yet —
 * offerings load asynchronously, and a paywall that renders blank while
 * waiting looks broken.
 */
export interface StorePrice {
  /** Ready to render, e.g. "$3.99", "₾10.99", "3,99 €". */
  display: string;
  /** True once the figure came from the store rather than the fallback. */
  fromStore: boolean;
}

// `solo`/`family` are the shop carousel's names for the same two tiers the
// profile calls `pro`/`pro_plus` (see MobileProCarousel and ShopRightSidebar),
// so both spellings map here.
const TIER_TO_PRODUCT: Record<string, string> = {
  solo: IAP_PRODUCTS.PRO_MONTHLY,
  pro: IAP_PRODUCTS.PRO_MONTHLY,
  family: IAP_PRODUCTS.PRO_PLUS_MONTHLY,
  pro_plus: IAP_PRODUCTS.PRO_PLUS_MONTHLY,
};

/**
 * Returns a resolver rather than a single price, because paywalls render a
 * list of tiers and a hook cannot be called inside the map.
 *
 * The key is either a tier id (`pro`, `family`, …) or a store product id
 * directly — gem packs already carry their `productId`, and routing them
 * through a tier alias would only be a second table to keep in sync.
 */
export function useStorePrice() {
  const { getProduct } = useInAppPurchases();

  return (tierOrProductId: string, fallbackUsd: number, webGel?: number): StorePrice => {
    // Web: Stripe takes the payment in GEL, so show the GEL the checkout
    // actually charges when the caller knows it — PRO_PRODUCTS in
    // create-pro-checkout prices Solo at 9.99 and Family at 19.99. The
    // conversion below is a flat 2.75x on the USD figure, which quoted 10.97
    // for a 9.99 charge: a price on the screen that is not the price taken.
    //
    // Without a GEL figure it stays the conversion, which is all a gem pack
    // or a shop item has.
    const webFallback = () => {
      if (webGel !== undefined) {
        return { display: `${webGel.toFixed(2)} ₾`, fromStore: false };
      }
      const p = getPriceDisplay(fallbackUsd);
      return { display: `${p.symbol}${p.value}${p.suffix}`, fromStore: false };
    };

    // Native: never convert. Apple charges the App Store Connect tier in the
    // storefront's own currency, and `usdToGel` is a constant 2.75 multiplier
    // that has no relationship to it. A Georgian user was shown "10.97 ₾" for
    // a product Apple would charge some other ₾ amount for — a price on the
    // screen that does not match the price in the sheet, which is what
    // guideline 2.3.1 rejects for, and which a reviewer sees by looking.
    //
    // The USD figure is at least the real configured price of the tier, so it
    // is what to show while the store has not answered. Callers that can
    // render a skeleton should prefer `fromStore` over this.
    const nativeFallback = () => ({
      display: `$${fallbackUsd.toFixed(2).replace(/\.00$/, "")}`,
      fromStore: false,
    });

    if (!Capacitor.isNativePlatform()) return webFallback();

    const productId = TIER_TO_PRODUCT[tierOrProductId] ?? tierOrProductId;
    const product = getProduct(productId);

    return product?.price
      ? { display: product.price, fromStore: true }
      : nativeFallback();
  };
}
