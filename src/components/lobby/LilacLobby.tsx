import { type ReactNode, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import iconInvite from "@/assets/vk-lobby/icon-invite.svg";
import iconBack from "@/assets/vk-lobby/icon-back.svg";
import iconHelp from "@/assets/vk-lobby/icon-help.svg";
import iconPlay from "@/assets/vk-lobby/icon-play.svg";
import plusSeat from "@/assets/vk-lobby/plus-seat.svg";
import coinPng from "@/assets/tb-lobby/coin.png";

/**
 * Shared pieces of the lilac lobby screens, extracted from Figma
 * kTmQjqS4JrxlOYP9NdN4Vl — Versus King (940:7474) and Team Battle (938:6019).
 * Both frames are a fixed 500x946 canvas full of absolutely-positioned
 * elements, so the whole screen renders at design coordinates inside
 * ScaledCanvas and is scaled to the viewport width — pixel-faithful at any
 * device size.
 */

export const LILAC_BG = "#f5d9ff";
export const HEADING_COLOR = "#523b76";

export function ScaledCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fit-to-viewport, the game-screen way: scale by whichever dimension is
    // tighter and center the canvas, so the whole screen — Start button
    // included — is always on screen with no scrolling and no clipping.
    // The parent supplies the safe-area-inset box; letterboxing disappears
    // into the page background.
    const update = () =>
      setScale(Math.min(el.clientWidth / 500, el.clientHeight / 946));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center overflow-hidden">
      {scale > 0 && (
        <div style={{ width: 500 * scale, height: 946 * scale }}>
          <div style={{ width: 500, height: 946, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Fits a fixed-coordinate design region into whatever box the flex layout
 * gives it: scaled by the tighter dimension, centered. Used for the scene
 * region only — chrome (header, strip, CTA) lives in normal flow so it can
 * own the screen edges and safe areas.
 */
export function FitBox({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(el.clientWidth / width, el.clientHeight / height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center">
      {scale > 0 && (
        <div style={{ width: width * scale, height: height * scale }}>
          <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative" }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Header row — back, TASolivare title, help (940:7493 / 938:6022). Same box
 * as the home header (px-4 py-3, 40px buttons) so the chrome height never
 * jumps between pages.
 */
export function LilacHeader({
  title,
  onBack,
  onHelp,
}: {
  title: string;
  onBack: () => void;
  onHelp?: () => void;
}) {
  return (
    <div className="relative z-10 w-full max-w-[500px] mx-auto shrink-0 flex items-center justify-between px-4 py-3" style={{ transform: "translateZ(0)" }}>
      <div className="flex gap-[12px] items-center">
        <button onClick={onBack} className="flex items-center justify-center rounded-[9999px] size-[40px] active:scale-95 transition-transform">
          <img alt="" className="block size-[20px]" src={iconBack} />
        </button>
        <p
          className="leading-[28px] not-italic text-[26px] tracking-[-0.16px] whitespace-nowrap"
          style={{ fontFamily: "'TASolivare', sans-serif", color: HEADING_COLOR }}
        >
          {title}
        </p>
      </div>
      {onHelp && (
        <button onClick={onHelp} className="bg-[#f3f4f6] flex items-center justify-center rounded-[9999px] size-[40px] active:scale-95 transition-transform">
          <img alt="" className="block size-[20px]" src={iconHelp} />
        </button>
      )}
    </div>
  );
}

export interface InviteEntry {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  online: boolean;
}

function InviteAvatar({ url, nickname }: { url: string | null; nickname: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return (
      <img
        alt=""
        className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[9999px] size-full"
        src={url}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-[9999px]"
      style={{ backgroundImage: "linear-gradient(135deg, rgb(168,85,247) 0%, rgb(236,72,153) 100%)" }}
    >
      <p className="font-[Nunito] font-bold text-[16px] text-white">{nickname.charAt(0).toUpperCase()}</p>
    </div>
  );
}

/**
 * The friends invite row (940:7796 / 950:8514): dashed Invite + friend
 * cards. Full-bleed and horizontally scrollable — the cards run to the
 * physical screen edge instead of clipping mid-card.
 */
export function InviteRow({
  inviteLabel,
  entries,
  onInvite,
  onEntry,
}: {
  inviteLabel: string;
  entries: InviteEntry[];
  onInvite: () => void;
  onEntry: (entry: InviteEntry) => void;
}) {
  return (
    <div className="w-full shrink-0 flex h-[98px] items-start overflow-x-auto overflow-y-clip scrollbar-hide">
      <div className="flex gap-[12px] items-start px-[20px] py-[4px] mx-auto">
        <button onClick={onInvite} className="flex flex-col gap-[6px] items-center justify-center min-w-[68px] p-[8px] shrink-0 active:scale-95 transition-transform">
          <div className="border-2 border-[rgba(136,88,213,0.4)] border-dashed flex items-center justify-center rounded-[9999px] size-[52px]">
            <img alt="" className="block size-[24px]" src={iconInvite} />
          </div>
          <p className="font-[Nunito] font-medium leading-[16px] text-[#8858d5] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap">
            {inviteLabel}
          </p>
        </button>
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onEntry(entry)}
            className={`flex flex-col gap-[6px] items-center p-[8px] rounded-[16px] shrink-0 active:scale-95 transition-transform ${
              entry.online ? "bg-[rgba(243,244,246,0.5)] border border-[#b99ce2] border-solid" : ""
            }`}
          >
            <div className="relative rounded-[9999px] shrink-0 size-[52px]">
              <InviteAvatar url={entry.avatarUrl} nickname={entry.nickname} />
            </div>
            <div className="flex flex-col h-[16px] items-center max-w-[70px] overflow-clip shrink-0">
              <p className="font-[Nunito] font-medium leading-[16px] text-[#0f1729] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap">
                {entry.nickname}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * An occupied seat over the scene — white/team ring avatar (940:7477…).
 * A pending invitee holds the seat greyed with a dashed ring until they
 * accept. Hold the seat to open the host's manage menu.
 */
export function Seat({
  left,
  top,
  avatarUrl,
  nickname,
  ring = "white",
  pending,
  onClick,
  onLongPress,
}: {
  left: number;
  top: number;
  avatarUrl: string | null;
  nickname: string;
  ring?: "white" | "blue" | "red";
  pending?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const startHold = () => {
    if (!onLongPress) return;
    fired.current = false;
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, 450);
  };
  const clearHold = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const border =
    ring === "blue"
      ? "3px solid rgba(68,111,238,0.61)"
      : ring === "red"
        ? "3px solid #ed6149"
        : "1px solid #ffffff";
  return (
    <button
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onClick?.();
      }}
      className={`absolute rounded-[9999px] size-[52px] overflow-clip select-none ${pending ? "opacity-50" : ""}`}
      style={{
        left,
        top,
        border: pending ? "2px dashed rgba(255,255,255,0.95)" : border,
        filter: pending ? "grayscale(0.4)" : undefined,
        WebkitTouchCallout: "none",
      }}
    >
      <InviteAvatar url={avatarUrl} nickname={nickname} />
    </button>
  );
}

export interface ChooserOption {
  icon: ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
}

/**
 * The + seat's question: who takes this seat? A soft white sheet over the
 * lilac wash with one rich row per real option (invite a friend, seat an AI
 * player, sit here yourself…) — each row does exactly what it says.
 */
export function PlusChooser({
  open,
  title,
  options,
  onClose,
}: {
  open: boolean;
  title: string;
  options: ChooserOption[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center px-7 backdrop-blur-[10px] bg-[rgba(245,217,255,0.6)]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="w-full max-w-[340px] rounded-[28px] bg-white/95 border border-[#e8e0f5] p-5 flex flex-col gap-3 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18),0px_2px_8px_0px_rgba(102,51,153,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-[20px] text-[#523b76] text-center pb-1"
          style={{ fontFamily: "'TASolivare', sans-serif" }}
        >
          {title}
        </p>
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              onClose();
              option.onPress();
            }}
            className="w-full flex items-center gap-3 rounded-[18px] bg-[#f8f5ff] border border-[#efe9fb] px-4 py-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center justify-center shrink-0 size-[42px] rounded-full bg-[#ede4fb] text-[#8858d5]">
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-[Nunito] font-bold text-[15px] text-[#402666]">
                {option.label}
              </span>
              {option.sub && (
                <span className="block font-[Nunito] text-[12px] text-[#402666]/55 truncate">
                  {option.sub}
                </span>
              )}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}

export interface SeatMenuAction {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

/** Hold-a-seat menu: the target's face plus the actions the holder may take. */
export function SeatMenu({
  target,
  onClose,
  actions,
}: {
  target: { nickname: string; avatarUrl: string | null } | null;
  onClose: () => void;
  actions: SeatMenuAction[];
}) {
  const { t } = useLanguage();
  if (!target) return null;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center px-8 backdrop-blur-[10px] bg-[rgba(245,217,255,0.6)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-[24px] bg-white/95 border border-[#e8e0f5] p-5 flex flex-col items-center gap-3 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-full size-[64px] overflow-clip">
          <InviteAvatar url={target.avatarUrl} nickname={target.nickname} />
        </div>
        <p className="text-[19px] text-[#523b76]" style={{ fontFamily: "'TASolivare', sans-serif" }}>
          {target.nickname}
        </p>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              onClose();
              action.onPress();
            }}
            className={`w-full h-[46px] rounded-[16px] font-[Nunito] font-bold text-[15px] active:scale-[0.98] transition-transform ${
              action.destructive
                ? "bg-[#fee2e2] text-[#b91c1c]"
                : "bg-[#f3ebfd] text-[#523b76]"
            }`}
          >
            {action.label}
          </button>
        ))}
        <button onClick={onClose} className="font-[Nunito] text-sm font-semibold text-[#523b76]/50">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

/** An open seat — the translucent green plus circle (940:7478…). */
export function PlusSeat({ left, top, onClick }: { left: number; top: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bg-[rgba(51,192,84,0.6)] border border-solid border-white overflow-clip rounded-[9999px] size-[52px] active:scale-95 transition-transform"
      style={{ left, top }}
    >
      <div className="absolute inset-[30%]">
        <img alt="" className="block max-w-none size-full" src={plusSeat} />
      </div>
    </button>
  );
}

/** The gold-coin value pill (943:21933 shape family). */
export function CoinPill({
  left,
  top,
  width = 190,
  value,
}: {
  left: number;
  top: number;
  width?: number;
  value: string;
}) {
  return (
    <div
      className="absolute border border-[#a27cdf] border-solid h-[67px] rounded-[20.192px]"
      style={{ left, top, width }}
    >
      <div aria-hidden className="absolute bg-[rgba(255,255,255,0.66)] inset-0 pointer-events-none rounded-[20.192px]" />
      <p
        className="absolute left-1/2 top-1/2 font-[Nunito] font-black leading-[34.719px] text-[#334155] text-[28px] text-center tracking-[-0.202px] whitespace-nowrap"
        style={{ transform: "translate(calc(-50% + 20px), -50%)" }}
      >
        {value}
      </p>
      <div className="absolute left-[14px] size-[55px] top-[4px]">
        <img alt="" className="absolute inset-0 max-w-none object-contain size-full" src={coinPng} />
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2.031px_0px_0px_white]" />
    </div>
  );
}

// Sparkle offsets for the pot's celebration burst.
const SPARKS: [number, number][] = [
  [-46, -26], [44, -30], [-58, 6], [54, 10], [-24, -46], [28, -44],
];

/**
 * The pot, alive: the number slot-rolls from its previous value (0 on first
 * load) to the current one, the pill pops, the coin wobbles, and a small
 * sparkle burst fires — on mount, on a duration flip, and whenever a seat
 * changes the pool.
 */
export function AnimatedCoinPill({
  left,
  top,
  width = 190,
  value,
}: {
  left: number;
  top: number;
  width?: number;
  value: number;
}) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    setBurst((b) => b + 1);
    return () => controls.stop();
  }, [value, mv]);

  return (
    <div
      className="absolute border border-[#a27cdf] border-solid h-[67px] rounded-[20.192px]"
      style={{ left, top, width }}
    >
      <div aria-hidden className="absolute bg-[rgba(255,255,255,0.66)] inset-0 pointer-events-none rounded-[20.192px]" />
      <motion.div
        key={`pulse-${burst}`}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.09, 1] }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <p
          className="absolute left-1/2 top-1/2 font-[Nunito] font-black leading-[34.719px] text-[#334155] text-[28px] text-center tracking-[-0.202px] whitespace-nowrap tabular-nums"
          style={{ transform: "translate(calc(-50% + 20px), -50%)" }}
        >
          {display.toLocaleString()}
        </p>
        <motion.div
          key={`coin-${burst}`}
          initial={{ rotate: 0, scale: 1 }}
          animate={{ rotate: [0, -14, 12, 0], scale: [1, 1.22, 1] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute left-[14px] size-[55px] top-[4px]"
        >
          <img alt="" className="absolute inset-0 max-w-none object-contain size-full" src={coinPng} />
        </motion.div>
      </motion.div>
      {SPARKS.map(([dx, dy], i) => (
        <motion.span
          key={`spark-${burst}-${i}`}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.3 }}
          animate={{ opacity: 0, x: dx, y: dy, scale: 1.1 }}
          transition={{ duration: 0.7, delay: i * 0.04, ease: "easeOut" }}
          className="absolute left-[38px] top-[26px] text-[14px] text-[#f5b301] pointer-events-none select-none"
          aria-hidden
        >
          ✦
        </motion.span>
      ))}
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2.031px_0px_0px_white]" />
    </div>
  );
}

/** Divider line above the CTA (Line 16). */
export function Divider() {
  return (
    <div
      className="w-full max-w-[452px] mx-auto shrink-0 border-t"
      style={{ borderColor: "rgba(136,88,213,0.25)" }}
    />
  );
}

/** The big gradient Start CTA (940:7538 / 938:6291), pinned in flow above
 * the safe bottom inset. */
export function StartButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full max-w-[500px] mx-auto shrink-0 px-[24px] pt-[12px] pb-[16px]">
      <button
        onClick={onClick}
        disabled={disabled}
        className="relative h-[60px] w-full rounded-[20px] active:scale-[0.98] transition-transform disabled:opacity-50 overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, #8858d5 0%, #8858d5 50%, rgba(136,88,213,0.9) 100%)",
        }}
      >
        <div
          className="absolute h-px left-[8px] right-[8px] rounded-[9999px] top-0"
          style={{
            background:
              "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          className="absolute h-[20px] left-0 right-0 rounded-bl-[20px] rounded-br-[20px] bottom-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.1), rgba(0,0,0,0))" }}
        />
        <div
          className="absolute inset-0 rounded-[20px]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div className="relative flex gap-[8px] h-full items-center justify-center">
          <img alt="" className="block size-[20px]" src={iconPlay} />
          <p className="font-[Nunito] font-semibold leading-[28px] text-[18px] text-center text-white tracking-[-0.16px] whitespace-nowrap">
            {label}
          </p>
        </div>
      </button>
    </div>
  );
}

/**
 * A friend tapped in the invite strip peeks here — an overlay ON the lounge
 * (blurred lilac wash, no navigation) with their profile and one clear
 * action: invite them to this game. The lobby decides what inviting means.
 */
export function FriendPeek({
  friend,
  onClose,
  actionLabel,
  invitedLabel,
  invited,
  onAction,
}: {
  friend: InviteEntry | null;
  onClose: () => void;
  actionLabel: string;
  invitedLabel: string;
  invited: boolean;
  onAction: () => void;
}) {
  const { t } = useLanguage();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    setPoints(null);
    if (!friend) return;
    let alive = true;
    void supabase
      .from("profiles")
      .select("total_points")
      .eq("user_id", friend.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setPoints(data?.total_points ?? null);
      });
    return () => {
      alive = false;
    };
  }, [friend]);

  if (!friend) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-8 backdrop-blur-[10px] bg-[rgba(245,217,255,0.6)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[340px] rounded-[24px] bg-white/95 border border-[#e8e0f5] p-6 flex flex-col items-center gap-3 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18),0px_2px_8px_0px_rgba(102,51,153,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-full size-[88px] overflow-clip">
          <InviteAvatar url={friend.avatarUrl} nickname={friend.nickname} />
        </div>
        <p
          className="text-[22px] text-[#523b76]"
          style={{ fontFamily: "'TASolivare', sans-serif" }}
        >
          {friend.nickname}
        </p>
        {points !== null && (
          <p className="font-[Nunito] text-sm text-[#523b76]/60 -mt-2">
            {points.toLocaleString()} {t("extra.pointsLabel", { count: "" }).trim()}
          </p>
        )}
        <button
          onClick={invited ? undefined : onAction}
          disabled={invited}
          className="w-full h-[52px] rounded-[18px] text-white font-[Nunito] font-bold text-[16px] active:scale-[0.98] transition-transform disabled:opacity-80"
          style={{
            background: invited
              ? "#4ade80"
              : "linear-gradient(to bottom, #8858d5, rgba(136,88,213,0.9))",
          }}
        >
          {invited ? `✓ ${invitedLabel}` : actionLabel}
        </button>
        <button onClick={onClose} className="font-[Nunito] text-sm font-semibold text-[#523b76]/50">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

/** The captain chip (936:21188): empty chooser state or a filled captain. */
export function CaptainChip({
  left,
  top,
  avatarUrl,
  name,
  placeholder,
  accent,
  onClick,
}: {
  left: number;
  top: number;
  avatarUrl?: string | null;
  name?: string;
  placeholder?: string;
  accent?: string;
  onClick?: () => void;
}) {
  const filled = !!name;
  return (
    <button
      onClick={onClick}
      className="absolute bg-[#faecff] border-[1.153px] border-solid inline-flex gap-[11px] h-[52px] items-center pl-[12px] pr-[18px] max-w-[300px] rounded-[16.85px] shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
      style={{ left, top, borderColor: accent ?? "#e8e0f5" }}
    >
      {filled ? (
        <div className="relative rounded-[9999px] shrink-0 size-[32.5px] overflow-clip">
          <InviteAvatar url={avatarUrl ?? null} nickname={name ?? ""} />
        </div>
      ) : (
        <div className="bg-[rgba(192,192,192,0.24)] rounded-[9999px] shrink-0 size-[32.5px]" />
      )}
      <p
        className={`font-[Nunito] font-black leading-[28.974px] text-[#334155] text-[18.629px] text-center tracking-[-0.1686px] whitespace-nowrap overflow-hidden text-ellipsis ${filled ? "" : "opacity-40"}`}
      >
        {filled ? name : placeholder}
      </p>
    </button>
  );
}
