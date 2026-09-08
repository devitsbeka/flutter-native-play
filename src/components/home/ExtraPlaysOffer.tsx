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
import watchAdIcon from "@/assets/playlimit/watch-ad.png";
import heartIcon from "@/assets/playlimit/heart.png";

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
   * coins and gems below the PRO offer, where a paid shortcut belongs.
   */
  section?: "all" | "ad" | "packs";
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
  if (section === "ad") {
    if (!adPack || !adsAvailable) return null;
    const isPending = pending === `${adPack.games}:ad`;
    return (
      <div className="text-left">
        {/* The whole card is the button (Figma 1102:4334/1102:4335) — a dark
            "chunky" card in the shape every button on this screen shares
            (rounded-bl/tl 24px, rounded-br 54px, a solid colour ledge
            underneath for depth), the clapperboard spilling over its top
            edge, and a "+1" heart pill standing in for a second line of copy
            explaining the reward.

            Drawn at the mock's own measures now that this sits on a screen
            rather than inside a 384px card: 99 tall, a 116px clapperboard
            hung 23 above its top edge, and the reward on the same white chip
            the counters over the chooser's shelf are drawn on. */}
        <motion.button
          type="button"
          onClick={() => void buy(adPack, "ad")}
          disabled={!!pending}
          whileTap={pending ? undefined : { scale: 0.99, y: 2 }}
          className="relative flex h-[99px] w-full items-center gap-3 overflow-visible rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px] border-2 border-[#949494] bg-[#5e5e5e] pl-[142px] pr-[24px] text-left disabled:opacity-70"
          style={{ boxShadow: "0 8px 0 0 #262626, 0 8px 16px rgba(0,0,0,0.18)" }}
        >
          <img
            src={watchAdIcon}
            alt=""
            className="pointer-events-none absolute -top-[23px] left-[14px] h-[116px] w-[116px] object-contain"
          />
          {/* min-w-0 so a longer translation wraps instead of shoving the
              pill past the card's own edge — a flex child's default min
              width is its unwrapped content, not 0. */}
          <p className="min-w-0 flex-1 font-display text-[20px] font-extrabold uppercase leading-[26px] text-white">
            {t("playLimit.adRowTitle")}
          </p>
          <span
            className="ml-auto flex h-[43px] w-[81px] shrink-0 items-center justify-center gap-[1px] rounded-[18px] border border-solid border-[#e8e0f5] bg-white/90 font-[Nunito] text-[16.16px] font-black tracking-[-0.146px] text-[#161e46]"
            style={{ boxShadow: "0 2.94px 0 #9ca29c, 0 4.409px 11.758px rgba(0,0,0,0.1)" }}
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            ) : (
              <>
                <img src={heartIcon} alt="" className="h-[33px] w-[33px] object-contain" />
                +1
              </>
            )}
          </span>
        </motion.button>
        {refused && (
          <p role="alert" className="mt-3 text-center text-xs font-semibold text-rose-500">
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
