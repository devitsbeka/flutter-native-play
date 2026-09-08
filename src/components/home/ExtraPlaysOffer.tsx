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
import filmRender from "@/assets/playlimit/film.png";
import heartRender from "@/assets/playlimit/heart.png";

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
export function ExtraPlaysOffer({
  onPurchased,
  section = "all",
}: {
  onPurchased?: () => void;
  /**
   * Which half to render.
   *
   * The limit modal used to stack every way of getting a play into one block
   * of six identical buttons, and the one that costs nothing — the ad — was a
   * small square labelled "Ad" between two numbers. It was reported as "no
   * option to watch an ad": not hidden, just unreadable as an action.
   *
   * "ad" renders it as its own row with a real button; "packs" renders the
   * coins and gems below the PRO offer, where a paid shortcut belongs; "wall"
   * is the out-of-lives screen's own black slab (Figma 1102:4334), where the
   * ad IS the row and the reward is stated on a chip at its end.
   */
  section?: "all" | "ad" | "packs" | "wall";
}) {
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
        // The ad button gets a little more of the row than the two price
        // buttons. "Watch ad" is a phrase where "500" is a number, and it was
        // previously labelled just "Ad" — which read as a category, not an
        // action, and got missed by the person testing it. If a player cannot
        // see the way past a paywall, neither can a reviewer.
        className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 font-display text-sm font-bold text-[#1E1B2E] disabled:opacity-60 ${
          source === "ad" ? "flex-[1.5]" : "flex-1"
        }`}
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

  // ── The rewarded ad, as its own row ──────────────────────────────────────
  //
  // First offer on the card and the only free one, so it gets a full-width
  // button with a verb on it instead of a square labelled "Ad". Google's own
  // guidance for rewarded ads is the same: say what the reward is, and make
  // opting in a deliberate tap rather than a guess.
  const adPack = EXTRA_PLAY_PACKS.find((pack) => pack.ad);

  // ── The same offer, as the out-of-lives wall draws it ────────────────────
  //
  // Figma 1102:4334: a pale frame with a black slab sitting a shade proud of
  // it, the film render hanging over its top edge, and what you get back on a
  // white chip at the far end. It is the only free way past the wall, so it is
  // the first thing under the title and the only dark thing on the screen.
  if (section === "wall") {
    if (!adPack || !adsAvailable) return null;
    const isPending = pending === `${adPack.games}:ad`;
    return (
      <div className="w-full">
        <div className="relative h-[99px] w-full rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px] border-2 border-solid border-white/60 bg-[rgba(252,247,255,0.6)] shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_24px_0px_rgba(102,51,153,0.12)]">
          <motion.button
            type="button"
            onClick={() => void buy(adPack, "ad")}
            disabled={!!pending}
            whileTap={pending ? undefined : { scale: 0.99 }}
            aria-label={t("playLimit.adRowTitle")}
            className="absolute left-[-1px] top-[-2px] flex h-[98px] w-[calc(100%+2px)] items-center rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px] border-2 border-solid border-[#949494] bg-[#5e5e5e] shadow-[0px_2px_8px_0px_rgba(51,51,51,0.06),0px_8px_0px_0px_#262626] transition-[transform,box-shadow] duration-100 active:translate-y-[4px] active:shadow-[0px_4px_0px_0px_#262626] disabled:opacity-70"
          >
            <img
              alt=""
              src={filmRender}
              className="pointer-events-none absolute left-[14px] top-[-23px] h-[116px] w-[116px] object-contain"
            />
            <span className="absolute left-[142px] right-[110px] top-[18px] text-left font-display text-[20px] font-bold uppercase leading-[26px] text-white">
              {t("playLimit.watchAd")}
            </span>
            {/* +1: what the ad is worth, on the same white chip the counters
                over the shelf are drawn on. */}
            <span className="absolute right-[24px] top-[22px] flex h-[43px] w-[81px] items-center rounded-[18px] border border-solid border-[#e8e0f5] bg-white/90 shadow-[0px_2.94px_0px_0px_#9ca29c,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)]">
              {isPending ? (
                <span className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              ) : (
                <>
                  <img alt="" src={heartRender} className="ml-[10px] h-[33px] w-[33px] shrink-0 object-contain" />
                  <span className="ml-[1px] font-[Nunito] text-[16.16px] font-black leading-[25.13px] tracking-[-0.146px] text-[#161e46]">
                    +{adPack.games}
                  </span>
                </>
              )}
            </span>
          </motion.button>
        </div>
        {refused && (
          <p role="alert" className="mt-3 text-center text-xs font-semibold text-rose-500">
            {refused === "ad_limit" ? t("playLimit.adLimitReached") : t("playLimit.purchaseFailed")}
          </p>
        )}
      </div>
    );
  }

  if (section === "ad") {
    if (!adPack || !adsAvailable) return null;
    const isPending = pending === `${adPack.games}:ad`;
    return (
      <div className="mt-4 text-left">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "#F5F8FF", border: "1.5px solid #C9D9F5" }}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "#E4ECFB" }}
          >
            <Play className="h-5 w-5 fill-current text-[#2C5BA8]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold leading-tight text-[#1E1B2E]">
              {t("playLimit.adRowTitle")}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-tight text-slate-500">
              {t("playLimit.adRowBody", { count: adPack.games })}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => void buy(adPack, "ad")}
            disabled={!!pending}
            whileTap={pending ? undefined : { scale: 0.96, y: 1 }}
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 font-display text-sm font-bold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(90deg, #3C6FD0 0%, #5B8BE8 100%)",
              boxShadow: "0 3px 0 #2C5BA8",
            }}
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              t("playLimit.adRowAction")
            )}
          </motion.button>
        </div>
        {refused && (
          <p role="alert" className="mt-2 text-center text-xs font-semibold text-rose-500">
            {refused === "ad_limit"
              ? t("playLimit.adLimitReached")
              : t("playLimit.purchaseFailed")}
          </p>
        )}
      </div>
    );
  }

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
            {section === "all" && pack.ad && adsAvailable && priceButton(pack, "ad")}
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
