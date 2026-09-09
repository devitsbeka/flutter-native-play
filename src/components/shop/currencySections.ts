/** The two shop sections that use the currency shelf instead of a product grid. */
export const CURRENCY_SECTION_IDS = ["coins", "gems-lari"] as const;
export type CurrencySectionId = (typeof CURRENCY_SECTION_IDS)[number];

export function isCurrencySection(id?: string): id is CurrencySectionId {
  return !!id && (CURRENCY_SECTION_IDS as readonly string[]).includes(id);
}
