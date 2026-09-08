import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/i18n";
import { useSound } from "@/contexts/SoundContext";
import giraffeIdle from "@/assets/mascots/animated-scene/giraffe-idle.webp";
import giraffePoked from "@/assets/mascots/animated-scene/giraffe-poked.webp";

/**
 * The developer-mode home scene: the mascot's wallpaper photo, brought to
 * life instead of sitting still.
 *
 * The character itself — the giraffe, the hoodie, the armchair, the side
 * table — is a studio-rendered illustration (`giraffe-idle`/`giraffe-poked`,
 * cut out to transparent PNGs), not hand-drawn shapes: matching the
 * production mascot renders' 3D, soft-toy quality was the whole point, and
 * that is not something SVG primitives get close to. What Framer Motion
 * adds on top is everything a still render can't: a slow idle sway/breathe
 * loop, floating pastel blobs behind it, and — on a poke — a haptic tap, a
 * quick squash-and-bounce, a heart/sparkle burst, and a brief crossfade to
 * a second render of the same character mid-laugh.
 *
 * Every loop animates only `transform`/`opacity` (no layout properties) so
 * it stays smooth on a phone GPU, and the ambient loops are skipped under
 * `prefers-reduced-motion` — the poke reaction still plays, just without
 * the idle motion.
 */

interface AnimatedMascotSceneProps {
  /** Positioning classes for the root layer. Defaults to the mobile mascot-scene contract. */
  className?: string;
  /** Whether tapping the giraffe pokes it (haptic + bounce). Off by default on desktop, where the scene click-catcher already owns full-area taps. */
  interactive?: boolean;
}

const BLOBS = [
  { top: "4%", left: "-8%", size: 190, color: "#E3D6FB", duration: 11, delay: 0 },
  { top: "10%", right: "-10%", size: 150, color: "#D6F5E8", duration: 13, delay: 0.6 },
  { top: "34%", left: "-6%", size: 120, color: "#FBE1F1", duration: 9.5, delay: 1.1 },
  { top: "52%", right: "-8%", size: 170, color: "#DCE7FB", duration: 12.5, delay: 0.3 },
  { top: "68%", left: "2%", size: 110, color: "#E3D6FB", duration: 10, delay: 1.6 },
  { top: "80%", right: "6%", size: 130, color: "#D6F5E8", duration: 14, delay: 0.9 },
] as const;

const SPARKLES = [
  { top: "16%", left: "22%", size: 7, delay: 0 },
  { top: "24%", left: "78%", size: 5, delay: 0.8 },
  { top: "44%", left: "12%", size: 6, delay: 1.6 },
  { top: "40%", left: "88%", size: 5, delay: 0.4 },
  { top: "60%", left: "84%", size: 6, delay: 1.2 },
] as const;

function FloatingBlobs() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            top: blob.top,
            left: "left" in blob ? blob.left : undefined,
            right: "right" in blob ? blob.right : undefined,
            width: blob.size,
            height: blob.size,
            background: blob.color,
            opacity: 0.55,
          }}
          animate={{ y: [0, -16, 0], scale: [1, 1.06, 1] }}
          transition={{
            duration: blob.duration,
            delay: blob.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function Sparkles() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1, 0.4] }}
          transition={{ duration: 3.2, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

interface Burst {
  id: number;
}

/** A little heart/sparkle pop, spawned on poke and removed once it plays out. */
function PokeBurst({ onDone }: { onDone: () => void }) {
  const glyphs = ["✦", "♥", "✦"] as const;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2">
      {glyphs.map((g, i) => (
        <motion.span
          key={i}
          className="absolute select-none text-[22px]"
          style={{ color: i === 1 ? "#F472B6" : "#C4B5FD", left: (i - 1) * 20 }}
          initial={{ opacity: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -50, scale: [0.4, 1.15, 0.9] }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: "easeOut" }}
          onAnimationComplete={i === glyphs.length - 1 ? onDone : undefined}
        >
          {g}
        </motion.span>
      ))}
    </div>
  );
}

/** How long the "poked" render stays up before crossfading back to idle. */
const POKE_REACTION_MS = 1400;

export function AnimatedMascotScene({
  className = "md:hidden absolute inset-0 z-[6] select-none overflow-hidden pointer-events-none",
  interactive = true,
}: AnimatedMascotSceneProps) {
  const reduceMotion = useReducedMotion();
  const { vibrate } = useSound();
  const bounce = useAnimationControls();
  const [poked, setPoked] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);
  const reactionTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(reactionTimeout.current), []);

  const idleLoop = reduceMotion
    ? { rotate: 0, y: 0 }
    : { rotate: [-1, 1, -1], y: [0, -3, 0] };
  const idleTransition = reduceMotion
    ? undefined
    : { duration: 4.6, repeat: Infinity, ease: "easeInOut" as const };

  const handlePoke = useCallback(() => {
    vibrate(10);
    burstId.current += 1;
    setBursts((prev) => [...prev, { id: burstId.current }]);
    setPoked(true);
    clearTimeout(reactionTimeout.current);
    reactionTimeout.current = setTimeout(() => setPoked(false), POKE_REACTION_MS);
    void bounce.start({
      scaleX: [1, 1.05, 0.96, 1.02, 1],
      scaleY: [1, 0.9, 1.06, 0.98, 1],
      rotate: [0, -3, 4, -1.5, 0],
      transition: { duration: 0.6, ease: "easeInOut" },
    });
  }, [bounce, vibrate]);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {/* Pale lavender wash — kept deliberately light, never a saturated fill. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #F6F2FF 0%, #EFE8FC 38%, #F8F5FF 72%, #FBF8FF 100%)",
        }}
      />
      <FloatingBlobs />
      <Sparkles />

      {/* Character + chair, bottom-anchored like the photo scene it replaces. */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none" style={{ height: "78%" }}>
        <motion.div
          animate={idleLoop}
          transition={idleTransition}
          style={{ originX: 0.5, originY: 1 }}
          className="relative h-full w-full max-w-[420px] pointer-events-none"
        >
          <motion.div animate={bounce} style={{ originX: 0.5, originY: 0.94 }} className="absolute inset-0">
            <motion.img
              src={giraffeIdle}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain object-bottom"
              style={{ filter: "drop-shadow(0 18px 22px rgba(90,60,150,0.22))" }}
              animate={{ opacity: poked ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.img
              src={giraffePoked}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain object-bottom"
              style={{ filter: "drop-shadow(0 18px 22px rgba(90,60,150,0.22))" }}
              animate={{ opacity: poked ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          {interactive && (
            <>
              <button
                type="button"
                aria-label={t("extra.pokeMascot")}
                onPointerDown={handlePoke}
                className="pointer-events-auto absolute inset-x-[18%] top-[4%] h-[54%] cursor-pointer rounded-full bg-transparent"
              />
              <AnimatePresence>
                {bursts.map((b) => (
                  <PokeBurst key={b.id} onDone={() => removeBurst(b.id)} />
                ))}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>

      {/* Same soft top wash the photo scene wears, so the chrome above it stays readable. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0) 28%), " +
            "linear-gradient(180deg, #E4D9FA 3%, rgba(228,217,250,0) 20%)",
        }}
      />
    </motion.div>
  );
}
