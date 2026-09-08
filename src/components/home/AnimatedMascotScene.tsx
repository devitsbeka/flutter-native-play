import { useCallback, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion, AnimatePresence } from "framer-motion";
import { t } from "@/lib/i18n";
import { useSound } from "@/contexts/SoundContext";

/**
 * The developer-mode home scene: the mascot's wallpaper photo, recreated as
 * a code-drawn, animated illustration instead of a static render.
 *
 * This is not an attempt to reproduce the 3D mascot renders pixel-for-pixel
 * — those are baked art (see `src/config/mascots.ts`) and stay the shipped
 * default. It is a from-scratch, flat-illustration take on the same scene
 * (giraffe, hoodie, armchair, side table), built entirely from SVG shapes
 * and Framer Motion so an admin previewing it under the developer toggle
 * sees what an animated home screen could feel like: idle breathing, ear
 * twitches, blinking, floating pastel blobs, and a poke reaction with
 * haptic feedback.
 *
 * Every loop below animates only `transform`/`opacity` (no layout
 * properties) so it stays smooth on a phone GPU, and every loop is skipped
 * under `prefers-reduced-motion` — the poke reaction still plays, just
 * without the ambient motion.
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

/** Soft "screen" highlight — one reusable gradient, positioned per shape, standing in for a light source. */
function Glow({
  cx,
  cy,
  rx,
  ry,
  opacity = 0.4,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity?: number;
  rotate?: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="url(#ams-glow)"
      opacity={opacity}
      style={{ mixBlendMode: "screen" }}
      transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined}
    />
  );
}

/** Soft "multiply" core-shadow — the Glow's complement, for the same cheap soft-toy shading. */
function Shade({
  cx,
  cy,
  rx,
  ry,
  opacity = 0.4,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity?: number;
  rotate?: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="url(#ams-shade)"
      opacity={opacity}
      style={{ mixBlendMode: "multiply" }}
      transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined}
    />
  );
}

/** One giraffe-coat patch — an irregular blob, never a plain ellipse. */
function SpotBlob({ cx, cy, r, rotate = 0, opacity = 0.55 }: { cx: number; cy: number; r: number; rotate?: number; opacity?: number }) {
  return (
    <path
      d="M0 -9 C6 -10 11 -5 10 1 C9 7 3 11 -3 10 C-9 9 -11 2 -9 -4 C-8 -8 -4 -9 0 -9 Z"
      fill="#C98A3E"
      opacity={opacity}
      transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${r / 10})`}
    />
  );
}

interface Burst {
  id: number;
}

/** A little heart/sparkle pop, spawned on poke and removed once it plays out. */
function PokeBurst({ onDone }: { onDone: () => void }) {
  const glyphs = ["✦", "♥", "✦"] as const;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2">
      {glyphs.map((g, i) => (
        <motion.span
          key={i}
          className="absolute select-none text-[20px]"
          style={{ color: i === 1 ? "#F472B6" : "#C4B5FD", left: (i - 1) * 18 }}
          initial={{ opacity: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -46, scale: [0.4, 1.1, 0.9] }}
          transition={{ duration: 0.85, delay: i * 0.06, ease: "easeOut" }}
          onAnimationComplete={i === glyphs.length - 1 ? onDone : undefined}
        >
          {g}
        </motion.span>
      ))}
    </div>
  );
}

export function AnimatedMascotScene({
  className = "md:hidden absolute inset-0 z-[6] select-none overflow-hidden pointer-events-none",
  interactive = true,
}: AnimatedMascotSceneProps) {
  const reduceMotion = useReducedMotion();
  const { vibrate } = useSound();
  const poke = useAnimationControls();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);

  const idleLoop = reduceMotion
    ? { rotate: 0, y: 0 }
    : { rotate: [-1.1, 1.1, -1.1], y: [0, -3, 0] };
  const idleTransition = reduceMotion
    ? undefined
    : { duration: 4.6, repeat: Infinity, ease: "easeInOut" as const };

  const handlePoke = useCallback(() => {
    vibrate(10);
    burstId.current += 1;
    setBursts((prev) => [...prev, { id: burstId.current }]);
    void poke.start({
      scaleX: [1, 1.06, 0.94, 1.03, 1],
      scaleY: [1, 0.88, 1.08, 0.97, 1],
      rotate: [0, -4, 5, -2, 0],
      transition: { duration: 0.62, ease: "easeInOut" },
    });
  }, [poke, vibrate]);

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
      <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none" style={{ height: "72%" }}>
        <motion.div
          animate={idleLoop}
          transition={idleTransition}
          style={{ originX: 0.5, originY: 1 }}
          className="relative h-full w-full max-w-[380px] pointer-events-none"
        >
          <motion.svg
            viewBox="0 0 340 520"
            className="absolute inset-0 h-full w-full pointer-events-none"
            preserveAspectRatio="xMidYMax meet"
            animate={poke}
            style={{ originX: 0.5, originY: 0.92 }}
          >
            <defs>
              <linearGradient id="ams-hoodie" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#AC87F6" />
                <stop offset="55%" stopColor="#8A5EE8" />
                <stop offset="100%" stopColor="#6E42CE" />
              </linearGradient>
              <linearGradient id="ams-skin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBE7BC" />
                <stop offset="100%" stopColor="#EFC583" />
              </linearGradient>
              <linearGradient id="ams-table" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DBD0F9" />
                <stop offset="100%" stopColor="#BFAEEE" />
              </linearGradient>
              <radialGradient id="ams-chair" cx="32%" cy="22%" r="90%">
                <stop offset="0%" stopColor="#BA9FF7" />
                <stop offset="55%" stopColor="#8763E3" />
                <stop offset="100%" stopColor="#6B47C9" />
              </radialGradient>
              <radialGradient id="ams-mug" cx="30%" cy="20%" r="95%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#EBE2FF" />
              </radialGradient>
              {/* One reusable highlight and one reusable core-shadow — every
                  Glow/Shade below is this same pair, just moved and resized,
                  which is what turns flat shapes into soft "toy" volumes. */}
              <radialGradient id="ams-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ams-shade" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3E2A66" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#3E2A66" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ground shadow — the chair reads as sitting on something, not floating. */}
            <ellipse cx="170" cy="513" rx="152" ry="18" fill="#4B2F92" opacity={0.22} />

            {/* Armchair — a rounder silhouette with tufting and a seam,
                shaded by the same two-gradient pass as the hoodie and skin. */}
            <path d="M40 520 V304 C40 256 80 238 102 238 h136 c22 0 62 18 62 66 v216 z" fill="url(#ams-chair)" />
            <Glow cx={106} cy={278} rx={72} ry={58} opacity={0.4} rotate={-12} />
            <Shade cx={232} cy={430} rx={72} ry={92} opacity={0.42} />
            <ellipse cx="170" cy="300" rx="112" ry="26" fill="#A98DF0" opacity={0.55} />
            <path d="M62 300 q108 -30 216 0" stroke="#5F3FB8" strokeWidth="2.4" fill="none" opacity={0.4} />
            <circle cx="140" cy="266" r="3.4" fill="#5F3FB8" opacity={0.55} />
            <circle cx="200" cy="266" r="3.4" fill="#5F3FB8" opacity={0.55} />
            <rect x="18" y="328" width="46" height="152" rx="23" fill="#8A63E0" />
            <rect x="256" y="328" width="46" height="152" rx="23" fill="#8A63E0" />
            <Glow cx={30} cy={348} rx={15} ry={44} opacity={0.32} />
            <Shade cx={42} cy={440} rx={22} ry={74} opacity={0.3} />
            <Shade cx={278} cy={440} rx={24} ry={74} opacity={0.4} />
            <ellipse cx="170" cy="470" rx="130" ry="30" fill="#4B2F92" opacity={0.28} />

            {/* Legs peeking under the hoodie. */}
            <rect x="132" y="420" width="20" height="46" rx="10" fill="url(#ams-skin)" />
            <rect x="176" y="420" width="20" height="46" rx="10" fill="url(#ams-skin)" />
            <Shade cx={142} cy={458} rx={10} ry={10} opacity={0.32} />
            <Shade cx={186} cy={458} rx={10} ry={10} opacity={0.32} />

            {/* Torso — the hoodie. Breathes independently of the whole-body sway. */}
            <motion.g
              animate={reduceMotion ? undefined : { scaleY: [1, 1.022, 1] }}
              transition={reduceMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: 0.5, originY: 0.9 }}
            >
              <path
                d="M108 430 V302 C108 258 134 254 170 254 C206 254 232 258 232 302 V430 q0 20 -20 20 h-84 q-20 0 -20 -20 z"
                fill="url(#ams-hoodie)"
              />
              <Glow cx={148} cy={306} rx={42} ry={48} opacity={0.38} rotate={-10} />
              <Shade cx={206} cy={408} rx={42} ry={52} opacity={0.34} />
              {/* The raised collar is the torso silhouette's own peak (above,
                  around x170/y254) — just a fold crease along its inner
                  edge, not a separate shape, so nothing competes with the
                  neck for that space. */}
              <path d="M136 288 q34 -14 68 0" stroke="#4A2E96" strokeWidth="2" fill="none" opacity={0.3} strokeLinecap="round" />
              {/* Fabric folds */}
              <path d="M118 402 q26 10 50 0" stroke="#4A2E96" strokeWidth="2" opacity={0.22} fill="none" strokeLinecap="round" />
              <path d="M122 344 q22 8 40 0" stroke="#4A2E96" strokeWidth="2" opacity={0.18} fill="none" strokeLinecap="round" />
              {/* Kangaroo pocket, stitched shut with a tiny crown embroidered on it */}
              <path d="M132 372 q38 18 76 0 v14 q-38 16 -76 0 z" fill="#7A50D6" opacity={0.92} />
              <path d="M132 372 q38 18 76 0" stroke="#4A2E96" strokeWidth="2" fill="none" opacity={0.5} />
              <path d="M162 381 l3 6 5 -7 5 7 3 -6 v5.5 h-16 z" fill="#F6E27A" opacity={0.9} />
              {/* Drawstrings, with aglet tips */}
              <line x1="158" y1="300" x2="154" y2="330" stroke="#4A2E96" strokeWidth="3" strokeLinecap="round" />
              <line x1="182" y1="300" x2="186" y2="330" stroke="#4A2E96" strokeWidth="3" strokeLinecap="round" />
              <circle cx="154" cy="332" r="2.6" fill="#4A2E96" />
              <circle cx="186" cy="332" r="2.6" fill="#4A2E96" />
            </motion.g>

            {/* Right arm holding the mug (giraffe's own left). */}
            <path d="M226 320 q30 6 30 44 q0 22 -22 24 l-10 -18 q12 -4 12 -18 q0 -18 -16 -22 z" fill="url(#ams-hoodie)" />
            <Shade cx={234} cy={332} rx={14} ry={16} opacity={0.36} />
            <g>
              <rect x="212" y="354" width="36" height="32" rx="9" fill="url(#ams-mug)" />
              <path d="M248 362 q17 0 17 13 t-17 13" stroke="url(#ams-mug)" strokeWidth="6" fill="none" strokeLinecap="round" />
              <ellipse cx="230" cy="360" rx="15" ry="4.6" fill="#4A2E1E" />
              <ellipse cx="230" cy="359.4" rx="12" ry="3.4" fill="#6B4326" />
              <path d="M218 358 q3 -6 8 -2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity={0.75} fill="none" />
              <Shade cx={238} cy={378} rx={10} ry={8} opacity={0.28} />
              {[0, 1, 2].map((i) => (
                <motion.path
                  key={i}
                  d={`M${222 + i * 8} 352 q-4 -10 2 -18`}
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                  animate={reduceMotion ? undefined : { y: [0, -6, 0], opacity: [0, 0.9, 0] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 2.4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }
                  }
                />
              ))}
            </g>
            {/* Wristwatch */}
            <rect x="222" y="348" width="14" height="8" rx="3" fill="#4B3B2A" />
            <circle cx="229" cy="352" r="1.7" fill="#EADFC8" opacity={0.85} />

            {/* Left arm resting on the chair arm. */}
            <path d="M114 320 q-26 10 -24 46 q2 18 20 18 l6 -16 q-10 -4 -10 -16 q0 -16 14 -20 z" fill="url(#ams-hoodie)" />
            <Shade cx={106} cy={332} rx={12} ry={14} opacity={0.32} />

            {/* Neck. */}
            <motion.g
              animate={reduceMotion ? undefined : { rotate: [-1.6, 1.6, -1.6] }}
              transition={reduceMotion ? undefined : { duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <path d="M150 300 q-6 -70 4 -130 q8 -30 24 -30 q16 0 20 30 q6 60 -6 130 z" fill="url(#ams-skin)" />
              <Glow cx={158} cy={210} rx={9} ry={72} opacity={0.28} />
              <Shade cx={185} cy={230} rx={8} ry={82} opacity={0.26} />
              <SpotBlob cx={156} cy={200} r={8} rotate={-10} />
              <SpotBlob cx={182} cy={230} r={9} rotate={8} />
              <SpotBlob cx={160} cy={260} r={7} rotate={20} />

              {/* Head. */}
              <g>
                {/* Ossicones */}
                <line x1="160" y1="146" x2="158" y2="120" stroke="#E8C793" strokeWidth="6" strokeLinecap="round" />
                <line x1="182" y1="146" x2="184" y2="120" stroke="#E8C793" strokeWidth="6" strokeLinecap="round" />
                <circle cx="158" cy="116" r="7" fill="#C99148" />
                <circle cx="184" cy="116" r="7" fill="#C99148" />
                <circle cx="156.5" cy="114" r="2" fill="#F0D9A8" opacity={0.8} />
                <circle cx="182.5" cy="114" r="2" fill="#F0D9A8" opacity={0.8} />

                {/* Ears — an inner patch on each gives them edge definition
                    against the similarly-toned head. */}
                <motion.g
                  animate={reduceMotion ? undefined : { rotate: [0, -9, 0] }}
                  transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
                  style={{ originX: 1, originY: 0.3 }}
                >
                  <path d="M136 166 q-36 -8 -42 16 q26 14 44 2 z" fill="#F0CE8E" />
                  <path d="M134 170 q-24 -4 -28 12 q17 9 29 1 z" fill="#FBEBCB" opacity={0.85} />
                  <Shade cx={110} cy={176} rx={10} ry={8} opacity={0.22} />
                </motion.g>
                <motion.g
                  animate={reduceMotion ? undefined : { rotate: [0, 9, 0] }}
                  transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut", delay: 0.1 }}
                  style={{ originX: 0, originY: 0.3 }}
                >
                  <path d="M204 166 q36 -8 42 16 q-26 14 -44 2 z" fill="#F0CE8E" />
                  <path d="M206 170 q24 -4 28 12 q-17 9 -29 1 z" fill="#FBEBCB" opacity={0.85} />
                  <Shade cx={230} cy={176} rx={10} ry={8} opacity={0.22} />
                </motion.g>

                {/* Head shape */}
                <path
                  d="M132 150 C132 112 148 96 170 96 C192 96 208 112 208 150 C208 174 200 188 190 196 C193 214 172 216 170 216 C168 216 147 214 150 196 C140 188 132 174 132 150 Z"
                  fill="url(#ams-skin)"
                />
                <Glow cx={150} cy={122} rx={26} ry={20} opacity={0.42} rotate={-14} />
                <Shade cx={196} cy={178} rx={22} ry={24} opacity={0.3} />
                <SpotBlob cx={150} cy={150} r={9} rotate={-6} />
                <SpotBlob cx={192} cy={158} r={8} rotate={10} />

                {/* Muzzle */}
                <ellipse cx="170" cy="196" rx="20" ry="14" fill="#FBEBCB" />
                <Shade cx={170} cy={204} rx={16} ry={7} opacity={0.24} />
                <Glow cx={166} cy={190} rx={9} ry={5} opacity={0.3} />
                <circle cx="163" cy="196" r="2" fill="#7A5A34" />
                <circle cx="177" cy="196" r="2" fill="#7A5A34" />
                <path d="M160 204 q10 8 20 0" stroke="#7A5A34" strokeWidth="2.4" fill="none" strokeLinecap="round" />

                {/* Blush */}
                <ellipse cx="142" cy="176" rx="8" ry="5" fill="#F5A0A8" opacity={0.4} style={{ mixBlendMode: "multiply" }} />
                <ellipse cx="198" cy="176" rx="8" ry="5" fill="#F5A0A8" opacity={0.4} style={{ mixBlendMode: "multiply" }} />

                {/* Eyebrows */}
                <path d="M140 130 q10 -6 20 -1" stroke="#8A6329" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity={0.7} />
                <path d="M200 130 q-10 -6 -20 -1" stroke="#8A6329" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity={0.7} />

                {/* Eyes, with a blinking eyelid overlay. */}
                {[152, 188].map((cx, i) => (
                  <g key={cx}>
                    <ellipse cx={cx} cy="152" rx="11" ry="13" fill="#FFFFFF" />
                    <circle cx={cx} cy="154" r="6.5" fill="#3A2A1E" />
                    <circle cx={cx + 2.4} cy="150.5" r="2.1" fill="#FFFFFF" />
                    <circle cx={cx - 2} cy="157" r="1" fill="#FFFFFF" opacity={0.7} />
                    <motion.ellipse
                      cx={cx}
                      cy="152"
                      rx="11.5"
                      ry="13.5"
                      fill="#F3D9A8"
                      animate={
                        reduceMotion ? { scaleY: 0 } : { scaleY: [0, 0, 1, 0, 0] }
                      }
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 4.2, repeat: Infinity, repeatDelay: 1.8 + i * 0.3, times: [0, 0.44, 0.5, 0.56, 1], ease: "easeInOut" }
                      }
                    />
                  </g>
                ))}
              </g>
            </motion.g>

            {/* Side table: books + a little plant, beside the chair — painted
                last so it sits in front of the armrest instead of behind it. */}
            <g opacity={0.98}>
              <rect x="258" y="398" width="10" height="64" rx="4" fill="#BFAEEE" />
              <ellipse cx="298" cy="398" rx="44" ry="14" fill="url(#ams-table)" />
              <ellipse cx="298" cy="394" rx="40" ry="11" fill="#EAE2FC" />
              <Glow cx={288} cy={390} rx={16} ry={6} opacity={0.5} />
              <rect x="272" y="360" width="44" height="16" rx="4" fill="#F7B8CE" transform="rotate(-3 294 368)" />
              <rect x="272" y="360" width="44" height="4" rx="2" fill="#FCDCE6" opacity={0.8} transform="rotate(-3 294 368)" />
              <rect x="274" y="344" width="40" height="16" rx="4" fill="#9BDCC4" transform="rotate(2 294 352)" />
              <rect x="274" y="344" width="40" height="4" rx="2" fill="#C4ECDE" opacity={0.8} transform="rotate(2 294 352)" />
              <g>
                <path d="M298 338 q-16 -8 -20 -28 q18 2 24 20 z" fill="#7FBF8B" />
                <path d="M298 338 q-4 -14 -8 -24" stroke="#5E9F6A" strokeWidth="1.4" fill="none" opacity={0.6} />
                <path d="M298 338 q16 -6 22 -26 q-18 0 -26 18 z" fill="#8FCB99" />
                <path d="M298 338 q4 -12 10 -20" stroke="#6BAE76" strokeWidth="1.4" fill="none" opacity={0.6} />
                <ellipse cx="298" cy="340" rx="14" ry="10" fill="#C9BCEF" />
                <Glow cx={293} cy={336} rx={6} ry={4} opacity={0.5} />
              </g>
            </g>
          </motion.svg>

          {interactive && (
            <>
              <button
                type="button"
                aria-label={t("extra.pokeMascot")}
                onPointerDown={handlePoke}
                className="pointer-events-auto absolute inset-x-[16%] top-[6%] h-[58%] cursor-pointer rounded-full bg-transparent"
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
