/**
 * What everything costs, in every currency the app charges in.
 *
 * ONE table, because the app had three answers to "what does PRO cost":
 * MobileProCarousel said 3.99, create-pro-checkout charged 9.99 GEL, and
 * useStorePrice showed a third figure by multiplying the first by 2.75 —
 * so a Georgian buyer was quoted 10.97 ₾ and charged 9.99 ₾. Gems were the
 * same fault the other way round: displayed in converted GEL, charged in
 * USD.
 *
 * The rule from here: nothing is converted, ever. A price exists in each
 * currency or it does not exist, and the figure shown is the figure taken.
 *
 * On a phone none of this is displayed — StoreKit hands back the storefront's
 * own localised string and that always wins (see useStorePrice, and guideline
 * 2.3.1: quoting a price Apple will not charge is a rejection). These are the
 * web's prices, and what a device shows in the moment before the store
 * answers.
 */

export type Currency = "GEL" | "USD" | "EUR";

/**
 * The currency a language is billed in.
 *
 * Georgian is the home market and is priced in lari; English defaults to
 * dollars; the European languages the app ships in are billed in euro. A
 * language with no entry falls back to USD rather than to the home currency,
 * because a euro price is a closer guess for a Spanish speaker than a lari
 * one.
 */
export const CURRENCY_BY_LANGUAGE: Record<string, Currency> = {
  ka: "GEL",
  en: "USD",
  de: "EUR",
  es: "EUR",
  fr: "EUR",
  it: "EUR",
  pt: "EUR",
};

export const DEFAULT_CURRENCY: Currency = "USD";

export function currencyForLanguage(language: string | null | undefined): Currency {
  if (!language) return DEFAULT_CURRENCY;
  return CURRENCY_BY_LANGUAGE[language] ?? DEFAULT_CURRENCY;
}

/** Everything the app sells for money, by the key the code refers to it by. */
export type PriceKey =
  | "pro_monthly"
  | "pro_annual"
  | "pro_plus_monthly"
  | "gems_100"
  | "gems_500"
  | "gems_1500"
  | "gems_5000";

/**
 * The price of each thing in each currency.
 *
 * USD is the App Store tier the product is configured at, so it is the anchor
 * — those are the figures a phone charges outside Georgia. EUR mirrors USD,
 * which is how Apple's own tiers line up either side of the Atlantic.
 *
 * **GEL is 1.25x USD for everything, and that single rate is load-bearing.**
 *
 * It used to be two rates: subscriptions at 1.25x and gems at 2.75x — the
 * latter inherited from the flat multiplier the old `usdToGel` converter
 * applied, kept at the time so that making the charge match the display would
 * not move anybody's price. Both halves were defensible on their own. Together
 * they were not, because of how the two ladders meet:
 *
 *   VIP is priced in GEMS, globally. Gems are priced in MONEY, per currency.
 *
 * So the real cost of a month of VIP is set by whatever the gem rate is in
 * your currency, and with two rates it came out at 4.81 GEL (against a 4.99
 * GEL subscription — fine) but only $1.75 (against a $3.99 subscription).
 * Every buyer outside Georgia could have PRO for 56% off by taking the gem
 * route, which has no renewal and no trial attached to it. There is no way to
 * fix that with a per-currency VIP price, because VIP does not have one.
 *
 * With one rate the two routes agree everywhere: 570 gems is $3.99 and 4.99
 * GEL, which is what the subscription costs in each. See VIP_PRICES in
 * src/config/rewardConfig.ts, which is the other half of this and moved with
 * it.
 *
 * The consequence to be aware of: gem-priced goods that are NOT VIP — powers,
 * coin packs, frames — got materially cheaper in lari, because Georgian
 * buyers had been paying 2.2x what dollar buyers paid for the same in-game
 * item. That is the overcharge coming off, not a discount.
 *
 * The annual subscription is the one row that does not follow 1.25x, and
 * deliberately: 59.88 GEL is 4.99 x 12, so the year carries no discount in
 * lari and buys the five friend seats instead, while 23.88 USD is half the
 * monthly rate. A subscription cannot be arbitraged into another currency, so
 * a per-market discount there creates no seam. Gems can, which is why they
 * cannot.
 *
 * Every one of these is a business decision and a one-line change; none of
 * them is derived at runtime.
 */
export const PRICES: Record<PriceKey, Record<Currency, number>> = {
  pro_monthly: { GEL: 4.99, USD: 3.99, EUR: 3.99 },
  // 4.99 x 12 in lari and 1.99 x 12 in dollars and euro, so the per-month
  // figure the paywall prints is a price rather than a rounding.
  //
  // In lari that is the SAME per month as the monthly plan: what the year
  // buys here is the five friend seats, not a discount. In dollars and euro
  // it is still half the monthly rate. Both are deliberate — see the note
  // above about lari being priced for its own market.
  pro_annual: { GEL: 59.88, USD: 23.88, EUR: 23.88 },
  pro_plus_monthly: { GEL: 9.99, USD: 7.99, EUR: 7.99 },
  // 1.25x USD, and monotonic in gems per unit of money. gems_1500 was 12.99,
  // which made it strictly dominated: three of the 500 pack is the same 1500
  // gems for 11.97, so the middle rung was the worst deal on the ladder AND
  // the one carrying no badge. At 10.99 the rate climbs 101 -> 125 -> 137 ->
  // 143 gems per dollar, which is what a ladder is supposed to do.
  gems_100: { GEL: 1.24, USD: 0.99, EUR: 0.99 },
  gems_500: { GEL: 4.99, USD: 3.99, EUR: 3.99 },
  gems_1500: { GEL: 13.74, USD: 10.99, EUR: 10.99 },
  gems_5000: { GEL: 43.74, USD: 34.99, EUR: 34.99 },
};

export function priceOf(key: PriceKey, currency: Currency): number {
  return PRICES[key][currency];
}

/** The locale Intl should format for, given the app's language. */
const INTL_LOCALE: Record<string, string> = {
  ka: "ka-GE",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
};

const SYMBOLS: Record<Currency, string> = { GEL: "₾", USD: "$", EUR: "€" };

/** Where the symbol goes when this file has to place it itself. */
const SYMBOL_LEADS: Record<Currency, boolean> = { GEL: false, USD: true, EUR: false };

/**
 * A price, written the way the buyer's own language writes money.
 *
 * Intl puts the symbol where the locale puts it — "9,99 €" in German, "$3.99"
 * in English, "9,99 ₾" in Georgian — which is the whole reason not to
 * assemble these by hand.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  language: string | null | undefined,
  /**
   * Digits after the separator. Two by default, because a subscription quoted
   * as "10 ₾" reads as an estimate — but a *free* trial is better written
   * "0 ₾" than "0,00 ₾", so the trial CTA asks for none.
   */
  fractionDigits = 2,
): string {
  const locale = INTL_LOCALE[language ?? ""] ?? "en-US";
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      // Prices here are always whole cents/tetri, and a subscription quoted
      // as "10 ₾" reads as an estimate.
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);

    // Two reasons to write it here instead: an engine with no Georgian
    // currency data prints "GEL 9.99", and one that has it prints "₾9.99",
    // while the app and the design have always written "9.99 ₾".
    if (formatted.includes(currency) || currency === "GEL") {
      const symbol = SYMBOLS[currency];
      const number = new Intl.NumberFormat(locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amount);
      return SYMBOL_LEADS[currency] ? `${symbol}${number}` : `${number} ${symbol}`;
    }
    return formatted;
  } catch {
    return `${amount.toFixed(fractionDigits)} ${SYMBOLS[currency]}`;
  }
}

/** Convenience: look up and format in one step. */
export function formatPriceOf(
  key: PriceKey,
  language: string | null | undefined,
): string {
  const currency = currencyForLanguage(language);
  return formatMoney(priceOf(key, currency), currency, language);
}
