/**
 * The server's copy of src/config/pricing.ts, and the localised text the
 * Stripe checkout puts in front of the buyer.
 *
 * An edge function cannot import from `src/`, so the figures are repeated
 * here — and `src/__tests__/repo-invariants.test.ts` fails if the two tables
 * ever disagree. That test is the only thing keeping a price change on one
 * side from quietly charging the other side's number.
 *
 * Nothing is converted. The currency comes from the buyer's language, the
 * amount comes from the table, and the amount shown in the app is the amount
 * taken here.
 */

export type Currency = "GEL" | "USD" | "EUR";

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

export function currencyForLanguage(language?: string | null): Currency {
  if (!language) return DEFAULT_CURRENCY;
  return CURRENCY_BY_LANGUAGE[language] ?? DEFAULT_CURRENCY;
}

export type PriceKey =
  | "pro_monthly"
  | "pro_annual"
  | "pro_plus_monthly"
  | "gems_100"
  | "gems_500"
  | "gems_1500"
  | "gems_5000";

export const PRICES: Record<PriceKey, Record<Currency, number>> = {
  pro_monthly: { GEL: 9.99, USD: 3.99, EUR: 3.99 },
  pro_annual: { GEL: 59.88, USD: 23.88, EUR: 23.88 },
  pro_plus_monthly: { GEL: 19.99, USD: 7.99, EUR: 7.99 },
  gems_100: { GEL: 2.72, USD: 0.99, EUR: 0.99 },
  gems_500: { GEL: 10.97, USD: 3.99, EUR: 3.99 },
  gems_1500: { GEL: 35.72, USD: 12.99, EUR: 12.99 },
  gems_5000: { GEL: 96.22, USD: 34.99, EUR: 34.99 },
};

export function priceOf(key: PriceKey, currency: Currency): number {
  return PRICES[key][currency];
}

/** Stripe wants the smallest unit, and all three currencies use 100 of them. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * What the buyer reads on Stripe's own page.
 *
 * Stripe renders the line item's name and description as given — it does not
 * translate — so a German buyer was reading Georgian. One entry per language
 * the app ships in, falling back to English rather than to the home language.
 */
interface ProductCopy {
  name: string;
  description: string;
}

type CopyKey = "pro_monthly" | "pro_annual" | "pro_plus_monthly";

const PRODUCT_COPY: Record<CopyKey, Record<string, ProductCopy>> = {
  pro_monthly: {
    ka: {
      name: "MyTrivia PRO — ყოველთვიური",
      description: "ულიმიტო თამაში, ყველა დონე, რეკლამის გარეშე, ორმაგი XP და 1 მეგობრის მოწვევა.",
    },
    en: {
      name: "MyTrivia PRO — Monthly",
      description: "Unlimited play, every level, no ads, double XP and 1 friend invite.",
    },
    de: {
      name: "MyTrivia PRO — Monatlich",
      description: "Unbegrenztes Spielen, alle Level, keine Werbung, doppelte XP und 1 Freundeseinladung.",
    },
    es: {
      name: "MyTrivia PRO — Mensual",
      description: "Juego ilimitado, todos los niveles, sin anuncios, XP doble y 1 invitación de amigo.",
    },
    fr: {
      name: "MyTrivia PRO — Mensuel",
      description: "Jeu illimité, tous les niveaux, sans publicité, XP double et 1 invitation d'ami.",
    },
    it: {
      name: "MyTrivia PRO — Mensile",
      description: "Gioco illimitato, tutti i livelli, senza pubblicità, XP doppi e 1 invito per un amico.",
    },
    pt: {
      name: "MyTrivia PRO — Mensal",
      description: "Jogo ilimitado, todos os níveis, sem anúncios, XP em dobro e 1 convite de amigo.",
    },
  },
  pro_annual: {
    ka: {
      name: "MyTrivia PRO — ყოველწლიური",
      description: "იგივე PRO, წელიწადში — თვეში ორჯერ იაფად. ულიმიტო თამაში, ყველა დონე, რეკლამის გარეშე, ორმაგი XP.",
    },
    en: {
      name: "MyTrivia PRO — Annual",
      description: "The same PRO, billed yearly at half the monthly rate. Unlimited play, every level, no ads, double XP.",
    },
    de: {
      name: "MyTrivia PRO — Jährlich",
      description: "Dasselbe PRO, jährlich zum halben Monatspreis. Unbegrenztes Spielen, alle Level, keine Werbung, doppelte XP.",
    },
    es: {
      name: "MyTrivia PRO — Anual",
      description: "El mismo PRO, facturado al año a mitad de precio mensual. Juego ilimitado, todos los niveles, sin anuncios, XP doble.",
    },
    fr: {
      name: "MyTrivia PRO — Annuel",
      description: "Le même PRO, facturé à l'année à moitié prix par mois. Jeu illimité, tous les niveaux, sans publicité, XP double.",
    },
    it: {
      name: "MyTrivia PRO — Annuale",
      description: "Lo stesso PRO, fatturato ogni anno a metà del prezzo mensile. Gioco illimitato, tutti i livelli, senza pubblicità, XP doppi.",
    },
    pt: {
      name: "MyTrivia PRO — Anual",
      description: "O mesmo PRO, cobrado por ano pela metade do preço mensal. Jogo ilimitado, todos os níveis, sem anúncios, XP em dobro.",
    },
  },
  pro_plus_monthly: {
    ka: {
      name: "MyTrivia სამეგობრო PRO — ყოველთვიური",
      description: "PRO შენთვის და 5 მეგობრისთვის: ულიმიტო თამაში, ყველა დონე, რეკლამის გარეშე, ორმაგი XP.",
    },
    en: {
      name: "MyTrivia Family PRO — Monthly",
      description: "PRO for you and up to 5 friends: unlimited play, every level, no ads, double XP.",
    },
    de: {
      name: "MyTrivia Familien-PRO — Monatlich",
      description: "PRO für dich und bis zu 5 Freunde: unbegrenztes Spielen, alle Level, keine Werbung, doppelte XP.",
    },
    es: {
      name: "MyTrivia PRO Familiar — Mensual",
      description: "PRO para ti y hasta 5 amigos: juego ilimitado, todos los niveles, sin anuncios, XP doble.",
    },
    fr: {
      name: "MyTrivia PRO Famille — Mensuel",
      description: "PRO pour toi et jusqu'à 5 amis : jeu illimité, tous les niveaux, sans publicité, XP double.",
    },
    it: {
      name: "MyTrivia PRO Famiglia — Mensile",
      description: "PRO per te e fino a 5 amici: gioco illimitato, tutti i livelli, senza pubblicità, XP doppi.",
    },
    pt: {
      name: "MyTrivia PRO Família — Mensal",
      description: "PRO para você e até 5 amigos: jogo ilimitado, todos os níveis, sem anúncios, XP em dobro.",
    },
  },
};

export function productCopy(key: CopyKey, language?: string | null): ProductCopy {
  const byLanguage = PRODUCT_COPY[key];
  return byLanguage[language ?? "en"] ?? byLanguage.en;
}

/** Gem packs are named by their count, which needs no translation. */
export function gemPackCopy(gems: number, language?: string | null): ProductCopy {
  const lines: Record<string, string> = {
    ka: `${gems} გემი MyTrivia-სთვის`,
    en: `${gems} gems for MyTrivia`,
    de: `${gems} Gems für MyTrivia`,
    es: `${gems} gemas para MyTrivia`,
    fr: `${gems} gemmes pour MyTrivia`,
    it: `${gems} gemme per MyTrivia`,
    pt: `${gems} gemas para MyTrivia`,
  };
  return {
    name: `${gems} 💎`,
    description: lines[language ?? "en"] ?? lines.en,
  };
}
