import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Timer, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopItem } from "@/hooks/useShopData";
import { DAILY_DEALS, HOURLY_DEALS, ShopDeal, dealSavings } from "@/config/shopDeals";
import { cn } from "@/lib/utils";

import gemIcon from "@/assets/icons/icon-gem.webp";
import coinIcon from "@/assets/icons/icon-coin.webp";
import powersIcon from "@/assets/icons/icon-powers-bottle.webp";
// The PRO brand logo (same crown used by the sidebar and PRO badges)
import proLogoIcon from "@/assets/crown-icon.png";

// Affordability isn't checked here on purpose — the page-level purchase
// handler already routes an underfunded tap to the NotEnoughGems modal.
interface DailyDealsRowProps {
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  onItemClick: (item: ShopItem) => void;
  /** The layout renders one shared შეთავაზებები title above PRO + deals. */
  hideTitle?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatRemaining(ms: number, withHours: boolean): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Converts a deal into a ShopItem so the page's existing purchase pipeline
// (spendGems → bundle grant via BUNDLE_CONTENTS) handles it unchanged.
function dealToShopItem(deal: ShopDeal, name: string): ShopItem {
  return {
    id: deal.id,
    name,
    description: "",
    price: deal.price,
    currency: "gems",
    icon: <img src={powersIcon} alt="" className="w-8 h-8 object-contain" />,
    gradient: "transparent",
  };
}

interface DealCardProps {
  deal: ShopDeal;
  label: string;
  remainingLabel: string;
  gradient: string;
  chipClass: string;
  urgent?: boolean;
  isPurchased: boolean;
  isLoading: boolean;
  onBuy: () => void;
}

function DealCard({
  deal,
  label,
  remainingLabel,
  gradient,
  chipClass,
  urgent = false,
  isPurchased,
  isLoading,
  onBuy,
}: DealCardProps) {
  const { t } = useLanguage();
  const savings = dealSavings(deal);

  return (
    <div
      className="relative flex min-h-[251px] flex-col overflow-hidden rounded-[24px] p-4 sm:p-5 text-white"
      style={{ background: gradient }}
    >
      {/* soft highlight blob so the card doesn't read flat */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />

      {/* Header: deal type + live countdown */}
      <div className="relative flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
            chipClass
          )}
        >
          {urgent ? <Zap className="h-3 w-3" /> : null}
          {label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold tabular-nums",
            urgent && "motion-safe:animate-pulse"
          )}
        >
          <Timer className="h-3.5 w-3.5" />
          {remainingLabel}
        </span>
      </div>

      {/* Middle block (name + discount + contents) floats centered — both
          axes — in the space between the header and the price row */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-7">
      <div className="flex items-center justify-center gap-2.5 text-center">
        <h3 className="font-display text-xl font-bold leading-none">{t(deal.nameKey)}</h3>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-extrabold text-amber-900"
          style={{
            background: "linear-gradient(180deg, hsl(50 95% 65%) 0%, hsl(45 90% 55%) 100%)",
            boxShadow: "0 2px 0 hsl(40 80% 45%)",
          }}
        >
          -{savings}%
        </span>
      </div>

      {/* Bundle contents: PRO time + powers + coins — centered */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {deal.contents.vip && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold backdrop-blur-[2px]">
            <img src={proLogoIcon} alt="" className="h-6 w-6 object-contain" />
            {deal.contents.vip === "week" ? t("shop.vipWeek") : t("shop.vipDay")}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold backdrop-blur-[2px]">
          <img src={powersIcon} alt="" className="h-6 w-6 object-contain" />
          {deal.contents.powers}× {t("shop.allPowers")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold backdrop-blur-[2px]">
          <img src={coinIcon} alt="" className="h-6 w-6 object-contain" />
          {deal.contents.coins.toLocaleString()}
        </span>
      </div>
      </div>

      {/* Price row: struck full price → deal price → buy */}
      <div className="relative flex items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-white/70 line-through decoration-2">
            <img
              src={gemIcon}
              alt=""
              className="h-4 w-4 object-contain opacity-80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
            />
            {deal.wasPrice}
          </span>
          <span className="flex items-center gap-1 text-xl font-extrabold">
            <img
              src={gemIcon}
              alt=""
              className="h-6 w-6 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
            />
            {deal.price}
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <motion.button
            onClick={onBuy}
            disabled={isPurchased}
            className="rounded-full px-5 py-2 text-sm font-bold text-[#402666] disabled:opacity-60"
            // White chunky pill, same recipe as the main page stat pills
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
              boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 #FFFFFF",
              border: "2px solid #E8E0F5",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 2 }}
          >
            {isPurchased ? t("common.owned") : t("shop.buy")}
          </motion.button>
        )}
      </div>
    </div>
  );
}

export function DailyDealsRow({ purchasedItems, isPurchasing, onItemClick, hideTitle = false }: DailyDealsRowProps) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Same offer for everyone at the same moment: index derives from wall time
  const dailyDeal = DAILY_DEALS[Math.floor(now / 86_400_000) % DAILY_DEALS.length];
  const hourlyDeal = HOURLY_DEALS[Math.floor(now / 3_600_000) % HOURLY_DEALS.length];

  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const nextHour = (Math.floor(now / 3_600_000) + 1) * 3_600_000;

  return (
    <motion.section
      className="mx-3 sm:mx-4 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {!hideTitle && (
        <div className="relative z-10 mb-3 mt-2 flex items-center gap-2.5 px-1">
          <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{t("shop.deals")}</h2>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DealCard
          deal={dailyDeal}
          label={t("shop.dailyDeal")}
          remainingLabel={formatRemaining(nextMidnight.getTime() - now, true)}
          gradient="linear-gradient(135deg, #4F46E5 0%, #2563EB 50%, #0EA5E9 100%)"
          chipClass="bg-white/25"
          isPurchased={purchasedItems.has(dailyDeal.id)}
          isLoading={isPurchasing === dailyDeal.id}
          onBuy={() => onItemClick(dealToShopItem(dailyDeal, t(dailyDeal.nameKey)))}
        />
        <DealCard
          deal={hourlyDeal}
          label={t("shop.hourlyDeal")}
          remainingLabel={formatRemaining(nextHour - now, false)}
          gradient="linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #0F766E 100%)"
          chipClass="bg-white/25"
          urgent
          isPurchased={purchasedItems.has(hourlyDeal.id)}
          isLoading={isPurchasing === hourlyDeal.id}
          onBuy={() => onItemClick(dealToShopItem(hourlyDeal, t(hourlyDeal.nameKey)))}
        />
      </div>
    </motion.section>
  );
}
