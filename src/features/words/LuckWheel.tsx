import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import coinIcon from "@/assets/icons/icon-coin.png";
import { describePrize, type Prize } from "./prizes";

/**
 * The prize wheel that follows some levels.
 *
 * Six wedges — hints and coins — and one spin. The wedge under the golden
 * pointer when the wheel stops is the prize. The result is chosen before the
 * wheel moves and the wheel is animated to land on it, which is the only way
 * the animation and the prize are guaranteed to agree.
 */

interface Wedge {
  color: string;
  prize: Prize;
}

const WEDGES: Wedge[] = [
  { color: "#2F6FE0", prize: { kind: "hints", amount: 1 } },
  { color: "#E8479B", prize: { kind: "hints", amount: 3 } },
  { color: "#E63946", prize: { kind: "coins", amount: 25 } },
  { color: "#F4C542", prize: { kind: "hints", amount: 1 } },
  { color: "#4CB944", prize: { kind: "coins", amount: 50 } },
  { color: "#7B3FBF", prize: { kind: "coins", amount: 10 } },
];

// Cheap prizes come up more than rich ones.
//
// Because they do, the wheel cannot be read off the picture: six equal-looking
// wedges, three of which are three times likelier than the others. The odds
// are shown on the screen — see `PRIZE_ODDS` and the disclosure below the
// wheel — which is what App Store guideline 3.1.1 asks of a randomised reward,
// and what `LuckySpinModal` already does for its own wheel.
const WEIGHTS = [22, 8, 20, 22, 8, 20];

/**
 * Every distinct prize and the chance of landing on it, as a percentage.
 *
 * Derived from WEDGES and WEIGHTS rather than typed out, so the disclosure
 * cannot drift away from the wheel it describes. Two wedges pay the same
 * prize (one hint), and their chances add: the player cares which prize they
 * get, not which wedge delivered it.
 */
export const PRIZE_ODDS: { prize: Prize; percent: number }[] = (() => {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  const byPrize = new Map<string, { prize: Prize; weight: number }>();
  WEDGES.forEach((w, i) => {
    const key = `${w.prize.kind}:${w.prize.amount}`;
    const existing = byPrize.get(key);
    if (existing) existing.weight += WEIGHTS[i];
    else byPrize.set(key, { prize: w.prize, weight: WEIGHTS[i] });
  });
  return [...byPrize.values()]
    .sort((a, b) => b.weight - a.weight)
    .map(({ prize, weight }) => ({ prize, percent: (weight / total) * 100 }));
})();

/** "8%" / "8.5%" — one decimal only when it changes the number. */
const formatPercent = (percent: number): string =>
  `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;

function pickWedge(random: () => number): number {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    roll -= WEIGHTS[i];
    if (roll < 0) return i;
  }
  return WEIGHTS.length - 1;
}

function WedgeIcon({ prize }: { prize: Prize }) {
  if (prize.kind === "hints") {
    return prize.amount > 1 ? (
      <Sparkles className="h-8 w-8 text-white" strokeWidth={2.4} fill="white" />
    ) : (
      <Lightbulb className="h-9 w-9 text-white" strokeWidth={2.4} fill="white" />
    );
  }
  if (prize.amount >= 25) {
    return (
      <div className="relative h-10 w-10">
        <img src={coinIcon} alt="" className="absolute left-0 top-2 h-7 w-7" draggable={false} />
        <img src={coinIcon} alt="" className="absolute left-3 top-0 h-7 w-7" draggable={false} />
      </div>
    );
  }
  return <img src={coinIcon} alt="" className="h-9 w-9" draggable={false} />;
}

interface Props {
  size: number;
  onDone: (prize: Prize) => void;
  random?: () => number;
}

export function LuckWheel({ size, onDone, random = Math.random }: Props) {
  const { t } = useLanguage();
  const { playSound, vibrate } = useSound();
  const [rotation, setRotation] = useState(0);
  const [state, setState] = useState<"idle" | "spinning" | "landed">("idle");
  const [prize, setPrize] = useState<Prize | null>(null);

  const wedge = 360 / WEDGES.length;
  const conic = `conic-gradient(${WEDGES.map(
    (w, i) => `${w.color} ${i * wedge}deg ${(i + 1) * wedge}deg`,
  ).join(", ")})`;

  const spin = () => {
    if (state !== "idle") return;
    const k = pickWedge(random);
    const jitter = (random() - 0.5) * (wedge * 0.6);
    // The pointer is at the top. Wedge k sits at k*60..(k+1)*60 clockwise
    // from the top, so turning the wheel by 360-(centre of k) brings it under
    // the pointer; the extra turns are for show.
    const target = 360 * 5 + (360 - (k * wedge + wedge / 2)) + jitter;
    setPrize(WEDGES[k].prize);
    setState("spinning");
    setRotation(target);
    playSound("button-click");
    vibrate(30);
  };

  const radius = size / 2;
  const iconRadius = radius * 0.64;
  const inner = size / 2 - size * 0.045;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "#1F3F8F",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.95), 0 10px 0 #D9D2E9, 0 14px 32px rgba(0,0,0,0.25)",
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ inset: size * 0.045, background: conic, boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" }}
          animate={{ rotate: rotation }}
          transition={{ duration: state === "spinning" ? 4.2 : 0, ease: [0.12, 0.8, 0.12, 1] }}
          onAnimationComplete={() => {
            if (state !== "spinning") return;
            setState("landed");
            playSound("reward");
            vibrate([40, 30, 120]);
          }}
        >
          {WEDGES.map((w, i) => {
            const angle = ((i * wedge + wedge / 2 - 90) * Math.PI) / 180;
            const x = inner + iconRadius * Math.cos(angle);
            const y = inner + iconRadius * Math.sin(angle);
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{ left: x - 22, top: y - 22, width: 44, height: 44 }}
              >
                <WedgeIcon prize={w.prize} />
              </div>
            );
          })}
        </motion.div>

        {/* Hub and pointer */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: size * 0.16, height: size * 0.16 }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: -size * 0.11,
              width: 0,
              height: 0,
              borderLeft: `${size * 0.045}px solid transparent`,
              borderRight: `${size * 0.045}px solid transparent`,
              borderBottom: `${size * 0.13}px solid #F4C542`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))",
            }}
          />
          <img src={coinIcon} alt="" className="absolute inset-0 h-full w-full drop-shadow-md" draggable={false} />
        </div>
      </div>

      <div className="mt-6 flex w-full justify-center">
        {state === "landed" && prize ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full">
            <ChunkyButton variant="gold" size="lg" className="w-full" onClick={() => onDone(prize)} showParticles>
              {t("words.collect")} · {describePrize(t, prize)}
            </ChunkyButton>
          </motion.div>
        ) : (
          <ChunkyButton variant="success" size="lg" className="w-full" onClick={spin} disabled={state !== "idle"}>
            {state === "spinning" ? t("words.spinning") : t("words.spinNow")}
          </ChunkyButton>
        )}
      </div>

      {/* Odds disclosure — App Store guideline 3.1.1. The wedges are not
          equally weighted, so this is the only place a player can find out
          what the wheel actually pays. Same shape as LuckySpinModal's.
          NOTE: these strings are inline English on purpose — src/locales/ is
          owned elsewhere this cycle. They are listed for translation. */}
      <details className="mt-4 w-full max-w-xs">
        <summary className="cursor-pointer text-center text-xs text-gray-500 hover:text-gray-700">
          📊 Win chances
        </summary>
        <div className="mt-2 space-y-1 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          <p className="mb-2 font-medium text-gray-700">Chance of each prize on one spin</p>
          {PRIZE_ODDS.map(({ prize, percent }) => (
            <div key={`${prize.kind}-${prize.amount}`} className="flex items-center justify-between">
              <span>{describePrize(t, prize)}</span>
              <span className="font-mono tabular-nums text-gray-500">{formatPercent(percent)}</span>
            </div>
          ))}
          <p className="mt-2 border-t border-gray-200 pt-2 text-gray-400">
            Every spin is independent, and the prize is drawn before the wheel
            moves. Prizes are in-game items only — they have no cash value and
            cannot be exchanged for money.
          </p>
        </div>
      </details>
    </div>
  );
}
