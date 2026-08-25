import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { useProPurchase } from "@/hooks/useProPurchase";
import { ProPlan, annualSaving, availablePlans, defaultPlan } from "@/config/proPlans";

import crownIcon from "@/assets/icons/icon-vip-crown.webp";
import benefitPlay from "@/assets/pro-banner/banner-gamepad.webp";
import benefitWheel from "@/assets/pro-banner/banner-wheel.webp";
import benefitNoAds from "@/assets/pro-banner/banner-no-ads.webp";
import benefitTimer from "@/assets/pro-banner/banner-timer.webp";
import benefitDiscount from "@/assets/pro-banner/banner-discount.webp";

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The subscription paywall: pick a plan, see what it buys, subscribe.
 *
 * Rows come from src/config/proPlans.ts intersected with the catalogue the
 * device reported, so this never offers a product the store cannot sell —
 * see availablePlans() for why that matters. Prices are StoreKit's own
 * localised strings wherever the store answered, because a price compiled
 * into the bundle is a price that is wrong in every other storefront.
 *
 * Buying goes through useProPurchase, which is already the one path that
 * knows RevenueCat on a phone and Stripe on the web. Nothing here talks to a
 * store directly.
 */
export function ProPaywallModal({ isOpen, onClose }: ProPaywallModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { products, purchasing, restorePurchases } = useInAppPurchases();
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

  /** The store's number for a plan, or the configured fallback. */
  const amountOf = (plan: ProPlan): number | null => {
    const product = products.find((p) => p.productId === plan.productId);
    if (product && product.priceAmountMicros > 0) return product.priceAmountMicros / 1_000_000;
    return plan.fallbackPrice ?? null;
  };

  /** What the row prints: StoreKit's localised string when there is one. */
  const priceLabel = (plan: ProPlan): string => {
    const product = products.find((p) => p.productId === plan.productId);
    if (product?.price) return product.price;
    return `$${plan.fallbackPrice.toFixed(2)}`;
  };

  const perMonthLabel = (plan: ProPlan): string | null => {
    if (plan.months <= 1) return null;
    const amount = amountOf(plan);
    if (amount === null) return null;
    return t("paywall.perMonth").replace("{price}", `$${(amount / plan.months).toFixed(2)}`);
  };

  const saving = selected ? annualSaving(selected, amountOf) : null;

  const handleSubscribe = async () => {
    if (!selected) return;
    if (!user) {
      onClose();
      navigate("/auth");
      return;
    }

    // Solo PRO is the tier every plan grants; the plan only decides how long
    // it is bought for. On the web that tier is all Stripe is told, because
    // create-pro-checkout prices by tier and has no annual line.
    const result = await initiateProCheckout("pro", isNative ? selected.productId : undefined);
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

  const benefits = [
    { art: benefitPlay, title: t("paywall.benefitPlayTitle"), blurb: t("paywall.benefitPlayBlurb") },
    { art: benefitWheel, title: t("paywall.benefitLevelsTitle"), blurb: t("paywall.benefitLevelsBlurb") },
    { art: benefitNoAds, title: t("paywall.benefitNoAdsTitle"), blurb: t("paywall.benefitNoAdsBlurb") },
    { art: benefitTimer, title: t("paywall.benefitXpTitle"), blurb: t("paywall.benefitXpBlurb") },
    { art: benefitDiscount, title: t("paywall.benefitShopTitle"), blurb: t("paywall.benefitShopBlurb") },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#1B1030]">
      {/* Crown over the plan's own violet, in place of the app art a store
          screenshot would use. Fixed height so the plans are on screen
          without a scroll on a short phone. */}
      <div className="relative shrink-0 h-[26vh] min-h-[150px] max-h-[240px] overflow-hidden bg-[linear-gradient(160deg,#6D28D9_0%,#4C1D95_55%,#2E1065_100%)]">
        <img
          src={crownIcon}
          alt=""
          className="absolute left-1/2 top-1/2 h-[62%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white active:scale-95"
          style={{ top: "calc(var(--safe-top) + 8px)" }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
        <h2 className="text-center font-display text-[clamp(22px,6.4vw,30px)] leading-[1.2] text-white">
          {t("paywall.title")}
        </h2>

        {/* Plans */}
        <div className="relative mt-6 rounded-3xl bg-white/[0.07] p-2">
          {saving !== null && (
            <div className="absolute -top-3 right-4 rounded-full bg-[#F5B301] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#2E1065]">
              {t("paywall.popularSave").replace("{amount}", `$${saving.toFixed(2)}`)}
            </div>
          )}

          {plans.map((plan) => {
            const isSelected = selected?.id === plan.id;
            const perMonth = perMonthLabel(plan);
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                aria-pressed={isSelected}
                className="flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left transition-colors active:bg-white/[0.06]"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? "border-[#F5B301] bg-[#F5B301]" : "border-white/25"
                  }`}
                >
                  {isSelected && (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#2E1065]" aria-hidden>
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
                  <span className="block font-bold text-white">
                    {t(plan.nameKey)}
                    {plan.trialDays ? ` ${t("paywall.freeTrialSuffix")}` : ""}
                  </span>
                  <span className="block text-sm text-white/55">{t(plan.blurbKey)}</span>
                </span>

                <span className="shrink-0 text-right">
                  <span className={`block font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                    {priceLabel(plan)}
                  </span>
                  {perMonth && <span className="block text-sm text-white/50">{perMonth}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-7 text-center text-sm text-white/70">{t("paywall.benefitsLead")}</p>

        <div className="mt-3 space-y-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex items-center gap-4 rounded-2xl bg-white/[0.07] p-3"
            >
              <img
                src={benefit.art}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl bg-black/20 object-contain p-1.5"
              />
              <div className="min-w-0">
                <p className="font-bold text-white">{benefit.title}</p>
                <p className="text-sm text-white/55">{benefit.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The buy row, always on screen. */}
      <div
        className="shrink-0 border-t border-white/10 bg-[#1B1030] px-5 pt-4"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
      >
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={busy || !selected}
          className="h-14 w-full rounded-full bg-[linear-gradient(180deg,#FFD066_0%,#F5A623_100%)] font-display text-lg uppercase tracking-wide text-[#2E1065] shadow-[0_6px_0_0_#C97F10] active:translate-y-[3px] active:shadow-[0_3px_0_0_#C97F10] disabled:opacity-60 transition-all"
        >
          {busy
            ? t("paywall.working")
            : selected?.trialDays
              ? t("paywall.ctaTrial").replace("{days}", String(selected.trialDays))
              : t("paywall.ctaSubscribe")}
        </button>

        {selected && (
          <p className="mt-3 text-center text-sm text-white/50">
            {(selected.trialDays ? t("paywall.footnoteTrial") : t("paywall.footnote"))
              .replace("{days}", String(selected.trialDays ?? 0))
              .replace("{price}", priceLabel(selected))
              .replace("{period}", t(`paywall.period_${selected.id}`))}
          </p>
        )}

        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] leading-tight text-white/40">
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
