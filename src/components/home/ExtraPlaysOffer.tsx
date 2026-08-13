import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAds } from "@/hooks/useAds";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { useLanguage } from "@/contexts/LanguageContext";
import { adService } from "@/services/adService";
import {
  EXTRA_PLAY_PACKS,
  canAffordExtraPlays,
  type ExtraPlayPack,
  type ExtraPlaySource,
} from "@/config/extraPlays";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";

/**
 * "Play now" for a player who has run out: one game or three, paid for with
 * coins, gems, or — for the single game — a rewarded ad.
 *
 * Mounted only while the limit modal is open, because it carries its own copy
 * of usePlayLimit and that costs a read.
 *
 * A price the player cannot meet is not hidden and not dead: it opens the
 * shop at the right shelf, which is where they were going to end up anyway.
 */
export function ExtraPlaysOffer({ onPurchased }: { onPurchased?: () => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { gateWithRewardedAd } = useAds();
  const { buyExtraPlays, windowMode } = usePlayLimit();
  // The one purchase in flight, as `${games}:${source}`, so only the button
  // that was tapped shows it — and no second tap lands while it runs.
  const [pending, setPending] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  const balances = { coins: profile?.coins ?? 0, gems: profile?.gems ?? 0 };

  // The legacy quota counts against a lifetime statistic that must not be
  // edited to hand out a game, so there is nothing to sell until the window
  // rule is the one in force. Ads only exist inside the native app: on the
  // web the rewarded gate proceeds without showing anything, which would make
  // the button a free game rather than a paid one.
  if (!windowMode) return null;
  const adsAvailable = adService.isRunningOnNative();

  const buy = async (pack: ExtraPlayPack, source: ExtraPlaySource) => {
    if (pending) return;
    const key = `${pack.games}:${source}`;

    if (source !== "ad" && !canAffordExtraPlays(pack, source, balances)) {
      navigate(source === "coins" ? "/power-ups?section=coins" : "/power-ups?section=gems-lari");
      return;
    }

    setPending(key);
    setRefused(null);
    try {
      // The ad plays first and the games are asked for after it: a purchase
      // credited before the ad was watched is a purchase that did not need
      // the ad. The gate fails open on a broken ad — deliberately, upstream —
      // so a player is never trapped behind an ad that will not load.
      if (source === "ad") {
        let result: Awaited<ReturnType<typeof buyExtraPlays>> = { ok: false, reason: "failed" };
        await gateWithRewardedAd(async () => {
          result = await buyExtraPlays(pack.games, "ad");
        });
        if (!result.ok) {
          setRefused(result.reason ?? "failed");
          return;
        }
      } else {
        const result = await buyExtraPlays(pack.games, source);
        if (!result.ok) {
          setRefused(result.reason ?? "failed");
          return;
        }
      }
      onPurchased?.();
    } finally {
      setPending(null);
    }
  };

  const priceButton = (pack: ExtraPlayPack, source: ExtraPlaySource) => {
    const key = `${pack.games}:${source}`;
    const isPending = pending === key;
    const affordable = canAffordExtraPlays(pack, source, balances);
    const label =
      source === "coins" ? pack.coins.toLocaleString() : source === "gems" ? String(pack.gems) : t("playLimit.watchAd");

    return (
      <motion.button
        key={source}
        type="button"
        onClick={() => void buy(pack, source)}
        disabled={!!pending}
        whileTap={pending ? undefined : { scale: 0.96, y: 1 }}
        aria-label={`${t("playLimit.extraGames", { count: pack.games })} — ${label}`}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 font-display text-sm font-bold text-[#1E1B2E] disabled:opacity-60"
        style={{
          background: affordable ? "#FFFFFF" : "#F3F4F6",
          border: "1.5px solid #E5E7EB",
          boxShadow: "0 2px 0 #E5E7EB",
          opacity: affordable ? 1 : 0.75,
        }}
      >
        {isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        ) : (
          <>
            {source === "coins" && <img src={coinChunky} alt="" className="h-5 w-5 object-contain" />}
            {source === "gems" && <img src={gemChunky} alt="" className="h-5 w-5 object-contain" />}
            {source === "ad" && <Play className="h-4 w-4 fill-current" />}
            <span className="whitespace-nowrap">{label}</span>
          </>
        )}
      </motion.button>
    );
  };

  return (
    <div className="mt-5 space-y-3 text-left">
      {EXTRA_PLAY_PACKS.map((pack) => (
        <div
          key={pack.games}
          className="rounded-2xl px-4 py-3"
          style={{ background: "#F5F8FF", border: "1.5px solid #C9D9F5" }}
        >
          <p className="font-display text-base font-bold text-[#1E1B2E]">
            {t("playLimit.extraGames", { count: pack.games })}
          </p>
          <div className="mt-2 flex gap-2">
            {priceButton(pack, "coins")}
            {priceButton(pack, "gems")}
            {pack.ad && adsAvailable && priceButton(pack, "ad")}
          </div>
        </div>
      ))}

      {refused && (
        <p role="alert" className="text-center text-xs font-semibold text-rose-500">
          {refused === "insufficient_funds"
            ? t("playLimit.notEnoughBalance")
            : refused === "ad_limit"
              ? t("playLimit.adLimitReached")
              : t("playLimit.purchaseFailed")}
        </p>
      )}
    </div>
  );
}
