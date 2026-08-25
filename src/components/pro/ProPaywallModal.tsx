import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { useStorePrice } from "@/hooks/useStorePrice";
import { useProPurchase } from "@/hooks/useProPurchase";
import { ProPlan, annualSaving, availablePlans, defaultPlan } from "@/config/proPlans";
import {
  BUY_SHADOW,
  GLASS_SHEEN,
  GOLD_BUTTON,
  SKIN_WHITE,
} from "@/components/shop/ProBannerCard";

import crownIcon from "@/assets/icons/icon-vip-crown.webp";
import benefitPlay from "@/assets/pro-banner/banner-gamepad.webp";
import benefitWheel from "@/assets/pro-banner/banner-wheel.webp";
import benefitNoAds from "@/assets/pro-banner/banner-no-ads.webp";
import benefitTimer from "@/assets/pro-banner/banner-timer.webp";
import benefitDiscount from "@/assets/pro-banner/banner-discount.webp";

/** The cover art the offer was tapped on, carried into the paywall. */
const COVER_ART = "/images/bgs.png";

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The subscription paywall: pick a plan, see what it buys, subscribe.
 *
 * Dressed as the rest of the app rather than as a paywall from somebody
 * else's game: the shop's own PRO skin — SKIN_WHITE's white cards, #402666
 * ink, violet-tinted tiles — and the same gold button the shop already sells
 * PRO with, imported rather than re-picked. The first version of this screen
 * was dark, a palette this app does not have on any page.
 *
 * Rows come from src/config/proPlans.ts intersected with the catalogue the
 * device reported, so this never offers a product the store cannot sell.
 * Prices are StoreKit's own localised strings wherever the store answered,
 * because a price compiled into the bundle is wrong in every other
 * storefront. Buying goes through useProPurchase, which is already the one
 * path that knows RevenueCat on a phone and Stripe on the web.
 */
export function ProPaywallModal({ isOpen, onClose }: ProPaywallModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { products, purchasing, restorePurchases } = useInAppPurchases();
  // The app's own price resolver: StoreKit's localised string on a phone,
  // the tier's figure converted to GEL on the web. Re-implementing it here
  // is how a Georgian user ends up shown "$3.99" for a charge in ₾.
  const resolvePrice = useStorePrice();
  const { initiateProCheckout, isProcessing } = useProPurchase();
  const [restoring, setRestoring] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const plans = useMemo(
    () => availablePlans(products.map((p) => p.productId), isNative),
    [products, isNative],
  );

  const [selectedId, setSelectedId] = useState<ProPlan["id"] | null>(null);

  // The paywall opens on the featured plan. Deferred to an effect because the
  // catalogue arrives from StoreKit a moment after the first render, and a
  // selection made before it lands would point at a row that is about to be
  // replaced.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedId((current) => {
      if (current && plans.some((p) => p.id === current)) return current;
      return defaultPlan(plans)?.id ?? null;
    });
  }, [isOpen, plans]);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  /**
   * The number behind a plan, for arithmetic only — the saving and the
   * per-month figure. Never rendered: what is shown is resolvePrice's
   * string, which is the store's in whichever currency it charges.
   */
  const amountOf = (plan: ProPlan): number | null => {
    const product = products.find((p) => p.productId === plan.productId);
    if (product && product.priceAmountMicros > 0) return product.priceAmountMicros / 1_000_000;
    return plan.fallbackUsd ?? null;
  };

  const priceLabel = (plan: ProPlan): string =>
    resolvePrice(plan.productId, plan.fallbackUsd ?? 0, plan.webGel).display;

  /**
   * Formats a figure derived from a plan's own price — the per-month rate,
   * the saving — in the currency that plan is quoted in.
   *
   * Only a multi-month plan needs one, and the only multi-month plan has no
   * fallback of its own: it appears when the store prices it, or not at all.
   * So there is always a currency code to format with, and never a case
   * where a derived number has to be guessed at in dollars.
   */
  const derivedLabel = (plan: ProPlan, amount: number): string | null => {
    const product = products.find((p) => p.productId === plan.productId);
    if (!product?.priceCurrencyCode) return null;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: product.priceCurrencyCode,
      }).format(amount);
    } catch {
      return null;
    }
  };

  const perMonthLabel = (plan: ProPlan): string | null => {
    if (plan.months <= 1) return null;
    const amount = amountOf(plan);
    if (amount === null) return null;
    const label = derivedLabel(plan, amount / plan.months);
    return label && t("paywall.perMonth").replace("{price}", label);
  };

  const handleSubscribe = async () => {
    if (!selected) return;
    if (!user) {
      onClose();
      navigate("/auth");
      return;
    }

    // The tier is what Stripe prices by on the web; the product id is what
    // StoreKit rings up on a phone, and two plans can grant the same tier
    // while differing in period.
    const result = await initiateProCheckout(
      selected.tier,
      isNative ? selected.productId : undefined,
    );
    if (result.success) onClose();
  };

  const handleRestore = async () => {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) onClose();
  };

  if (!isOpen) return null;

  const busy = purchasing || isProcessing || restoring;
  const ink = SKIN_WHITE.ink;
  const inkSoft = SKIN_WHITE.inkSoft;

  const benefits = [
    { art: benefitPlay, title: t("paywall.benefitPlayTitle"), blurb: t("paywall.benefitPlayBlurb") },
    { art: benefitWheel, title: t("paywall.benefitLevelsTitle"), blurb: t("paywall.benefitLevelsBlurb") },
    { art: benefitNoAds, title: t("paywall.benefitNoAdsTitle"), blurb: t("paywall.benefitNoAdsBlurb") },
    { art: benefitTimer, title: t("paywall.benefitXpTitle"), blurb: t("paywall.benefitXpBlurb") },
    { art: benefitDiscount, title: t("paywall.benefitShopTitle"), blurb: t("paywall.benefitShopBlurb") },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8F6FC]">
      {/* The cover the offer was tapped on, with the crown over it, so the
          paywall reads as this screen going deeper rather than as another app
          opening. It fades into the page wash at its foot. */}
      <div className="relative shrink-0 h-[24vh] min-h-[140px] max-h-[210px] overflow-hidden">
        <img src={COVER_ART} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(248,246,252,0)_0%,rgba(248,246,252,0.85)_65%,#F8F6FC_100%)]" />
        <img
          src={crownIcon}
          alt=""
          className="absolute left-1/2 top-1/2 h-[62%] -translate-x-1/2 -translate-y-[58%] object-contain drop-shadow-[0_10px_22px_rgba(64,38,102,0.35)]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(64,38,102,0.10)] bg-white/85 shadow-[0px_3px_0px_0px_rgba(64,38,102,0.10)] backdrop-blur-sm transition-all active:translate-y-[2px] active:shadow-[0px_1px_0px_0px_rgba(64,38,102,0.10)]"
          style={{ top: "calc(var(--safe-top) + 8px)", color: ink }}
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <h2
          className="text-center font-display text-[clamp(21px,6vw,28px)] uppercase leading-[1.2]"
          style={{ color: ink }}
        >
          {t("paywall.title")}
        </h2>

        {/* Plans */}
        <div className="mt-5 space-y-3">
          {plans.map((plan) => {
            const isSelected = selected?.id === plan.id;
            const perMonth = perMonthLabel(plan);
            const planSaving = annualSaving(plan, amountOf);
            const savingLabel = planSaving === null ? null : derivedLabel(plan, planSaving);
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                aria-pressed={isSelected}
                className="relative flex w-full items-center gap-3 rounded-[24px] border-[3px] border-solid px-4 py-4 text-left transition-all active:translate-y-[2px]"
                style={{
                  background: SKIN_WHITE.bg,
                  borderColor: isSelected ? "#7C3AED" : "rgba(124,58,237,0.16)",
                  boxShadow: isSelected
                    ? `${GLASS_SHEEN}, 0px 6px 0px 0px rgba(124,58,237,0.18), 0px 10px 24px 0px rgba(124,58,237,0.18)`
                    : `${GLASS_SHEEN}, 0px 4px 0px 0px rgba(68,36,107,0.06)`,
                }}
              >
                {/* The badge belongs to the plan that earns it, not to the
                    selection: moving it with the tap made it read as a label
                    for "selected" rather than for "cheapest per month". */}
                {savingLabel && (
                  <span
                    className="absolute -top-3 right-4 rounded-full bg-[#FCD34D] px-3 py-1 text-[11px] font-bold uppercase leading-none tracking-wide"
                    style={{ color: ink }}
                  >
                    {t("paywall.popularSave").replace("{amount}", savingLabel)}
                  </span>
                )}

                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isSelected ? "#7C3AED" : "rgba(64,38,102,0.22)",
                    background: isSelected ? "#7C3AED" : "transparent",
                  }}
                >
                  {isSelected && (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-white" aria-hidden>
                      <path
                        d="M4 10.5l4 4 8-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold leading-tight" style={{ color: ink }}>
                    {t(plan.nameKey)}
                    {plan.trialDays ? ` ${t("paywall.freeTrialSuffix")}` : ""}
                  </span>
                  <span className="block text-[13px]" style={{ color: inkSoft }}>
                    {t(plan.blurbKey)}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-[17px] font-bold" style={{ color: ink }}>
                    {priceLabel(plan)}
                  </span>
                  {perMonth && (
                    <span className="block text-[13px]" style={{ color: inkSoft }}>
                      {perMonth}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-7 text-center text-[15px] font-bold" style={{ color: ink }}>
          {t("paywall.benefitsLead")}
        </p>

        <div className="mt-3 space-y-2.5">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex items-center gap-3.5 rounded-[24px] border border-solid p-3"
              style={{
                background: SKIN_WHITE.tileFill,
                borderColor: SKIN_WHITE.tileEdge,
                boxShadow: GLASS_SHEEN,
              }}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/80 shadow-[0px_2px_0px_0px_rgba(64,38,102,0.06)]">
                <img src={benefit.art} alt="" className="h-11 w-11 object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold leading-tight" style={{ color: ink }}>
                  {benefit.title}
                </span>
                <span className="block text-[13px]" style={{ color: inkSoft }}>
                  {benefit.blurb}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* The buy row, always on screen. */}
      <div
        className="shrink-0 border-t border-[rgba(64,38,102,0.08)] bg-[#F8F6FC] px-5 pt-4"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
      >
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={busy || !selected}
          className="relative flex h-[62px] w-full items-center justify-center rounded-[24px] border-[3px] border-solid border-[#9fa8a3] p-[3px] transition-all active:translate-y-[3px] disabled:opacity-60"
          style={{ boxShadow: BUY_SHADOW }}
        >
          <span
            aria-hidden
            className="absolute inset-[3px] rounded-[20px]"
            style={{ backgroundImage: GOLD_BUTTON }}
          />
          <span
            aria-hidden
            className="absolute inset-[3px] rounded-[20px] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.35)]"
          />
          <span className="relative text-[18px] font-bold tracking-[-0.18px] text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)]">
            {busy
              ? t("paywall.working")
              : selected?.trialDays
                ? t("paywall.ctaTrial").replace("{days}", String(selected.trialDays))
                : t("paywall.ctaSubscribe")}
          </span>
        </button>

        {selected && (
          <p className="mt-3 text-center text-[13px]" style={{ color: inkSoft }}>
            {(selected.trialDays ? t("paywall.footnoteTrial") : t("paywall.footnote"))
              .replace("{days}", String(selected.trialDays ?? 0))
              .replace("{price}", priceLabel(selected))
              .replace("{period}", t(`paywall.period_${selected.id}`))}
          </p>
        )}

        <div
          className="mt-3 flex items-center justify-center gap-4 text-[11px] leading-tight"
          style={{ color: inkSoft }}
        >
          <button type="button" onClick={() => { onClose(); navigate("/terms"); }}>
            {t("paywall.terms")}
          </button>
          <button type="button" onClick={handleRestore} disabled={busy}>
            {t("paywall.restore")}
          </button>
          <button type="button" onClick={() => { onClose(); navigate("/privacy-policy"); }}>
            {t("paywall.privacy")}
          </button>
        </div>
      </div>
    </div>
  );
}
