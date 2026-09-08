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
              <linearGradient id="ams-chair" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8E6FE0" />
                <stop offset="100%" stopColor="#7452D6" />
              </linearGradient>
              <linearGradient id="ams-hoodie" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9A73EA" />
                <stop offset="100%" stopColor="#7C4DDB" />
              </linearGradient>
              <linearGradient id="ams-skin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F7DFAE" />
                <stop offset="100%" stopColor="#F0CE8E" />
              </linearGradient>
              <linearGradient id="ams-table" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D3C6F5" />
                <stop offset="100%" stopColor="#BFAEEE" />
              </linearGradient>
            </defs>

            {/* Armchair. */}
            <path
              d="M40 520 V300 q0 -60 60 -60 h100 q60 0 60 60 v220 z"
              fill="url(#ams-chair)"
            />
            <ellipse cx="170" cy="300" rx="112" ry="26" fill="#9B7FE8" opacity={0.6} />
            <rect x="18" y="330" width="46" height="150" rx="23" fill="#835FDB" />
            <rect x="256" y="330" width="46" height="150" rx="23" fill="#835FDB" />
            <ellipse cx="170" cy="470" rx="130" ry="30" fill="#6A48C4" opacity={0.5} />

            {/* Legs peeking under the hoodie. */}
            <rect x="132" y="420" width="20" height="46" rx="10" fill="url(#ams-skin)" />
            <rect x="176" y="420" width="20" height="46" rx="10" fill="url(#ams-skin)" />

            {/* Torso — the hoodie. Breathes independently of the whole-body sway. */}
            <motion.g
              animate={reduceMotion ? undefined : { scaleY: [1, 1.022, 1] }}
              transition={reduceMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: 0.5, originY: 0.9 }}
            >
              <path
                d="M108 430 V300 q0 -46 62 -46 q62 0 62 46 v130 q0 20 -20 20 h-84 q-20 0 -20 -20 z"
                fill="url(#ams-hoodie)"
              />
              {/* Kangaroo pocket */}
              <path d="M132 372 q38 18 76 0 v14 q-38 16 -76 0 z" fill="#B79CF0" opacity={0.85} />
              {/* Drawstrings */}
              <line x1="158" y1="300" x2="154" y2="330" stroke="#5F3FB8" strokeWidth="3" strokeLinecap="round" />
              <line x1="182" y1="300" x2="186" y2="330" stroke="#5F3FB8" strokeWidth="3" strokeLinecap="round" />
              {/* Hood collar */}
              <path d="M132 296 q38 22 76 0 q-4 20 -38 20 q-34 0 -38 -20 z" fill="#6B48CC" />
            </motion.g>

            {/* Right arm holding the mug (giraffe's own left). */}
            <path d="M226 320 q30 6 30 44 q0 22 -22 24 l-10 -18 q12 -4 12 -18 q0 -18 -16 -22 z" fill="url(#ams-hoodie)" />
            <g>
              <rect x="214" y="356" width="34" height="30" rx="8" fill="#FBF8FF" />
              <path d="M248 364 q16 0 16 12 t-16 12" stroke="#FBF8FF" strokeWidth="6" fill="none" strokeLinecap="round" />
              <rect x="214" y="356" width="34" height="7" rx="3.5" fill="#C9B6F2" />
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

            {/* Left arm resting on the chair arm. */}
            <path d="M114 320 q-26 10 -24 46 q2 18 20 18 l6 -16 q-10 -4 -10 -16 q0 -16 14 -20 z" fill="url(#ams-hoodie)" />

            {/* Neck. */}
            <motion.g
              animate={reduceMotion ? undefined : { rotate: [-1.6, 1.6, -1.6] }}
              transition={reduceMotion ? undefined : { duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <path d="M150 300 q-6 -70 4 -130 q8 -30 24 -30 q16 0 20 30 q6 60 -6 130 z" fill="url(#ams-skin)" />
              <ellipse cx="156" cy="200" rx="7" ry="10" fill="#D9A85C" opacity={0.6} transform="rotate(-10 156 200)" />
              <ellipse cx="182" cy="230" rx="8" ry="11" fill="#D9A85C" opacity={0.6} transform="rotate(8 182 230)" />
              <ellipse cx="160" cy="260" rx="7" ry="9" fill="#D9A85C" opacity={0.55} />

              {/* Head. */}
              <g>
                {/* Ossicones */}
                <line x1="160" y1="146" x2="158" y2="120" stroke="#E8C793" strokeWidth="6" strokeLinecap="round" />
                <line x1="182" y1="146" x2="184" y2="120" stroke="#E8C793" strokeWidth="6" strokeLinecap="round" />
                <circle cx="158" cy="116" r="7" fill="#C99148" />
                <circle cx="184" cy="116" r="7" fill="#C99148" />

                {/* Ears — an inner patch on each gives them edge definition
                    against the similarly-toned head. */}
                <motion.g
                  animate={reduceMotion ? undefined : { rotate: [0, -9, 0] }}
                  transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
                  style={{ originX: 1, originY: 0.3 }}
                >
                  <path d="M136 166 q-36 -8 -42 16 q26 14 44 2 z" fill="#F0CE8E" />
                  <path d="M134 170 q-24 -4 -28 12 q17 9 29 1 z" fill="#FBEBCB" opacity={0.85} />
                </motion.g>
                <motion.g
                  animate={reduceMotion ? undefined : { rotate: [0, 9, 0] }}
                  transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut", delay: 0.1 }}
                  style={{ originX: 0, originY: 0.3 }}
                >
                  <path d="M204 166 q36 -8 42 16 q-26 14 -44 2 z" fill="#F0CE8E" />
                  <path d="M206 170 q24 -4 28 12 q-17 9 -29 1 z" fill="#FBEBCB" opacity={0.85} />
                </motion.g>

                {/* Head shape */}
                <path
                  d="M132 150 q0 -46 38 -46 q38 0 38 46 q0 28 -16 42 q4 20 -22 20 q-26 0 -22 -20 q-16 -14 -16 -42 z"
                  fill="url(#ams-skin)"
                />
                <ellipse cx="150" cy="150" rx="8" ry="10" fill="#D9A85C" opacity={0.55} />
                <ellipse cx="192" cy="158" rx="7" ry="9" fill="#D9A85C" opacity={0.55} />

                {/* Muzzle */}
                <ellipse cx="170" cy="196" rx="20" ry="14" fill="#FBEBCB" />
                <circle cx="163" cy="196" r="2" fill="#7A5A34" />
                <circle cx="177" cy="196" r="2" fill="#7A5A34" />
                <path d="M160 204 q10 8 20 0" stroke="#7A5A34" strokeWidth="2.4" fill="none" strokeLinecap="round" />

                {/* Eyes, with a blinking eyelid overlay. */}
                {[152, 188].map((cx, i) => (
                  <g key={cx}>
                    <ellipse cx={cx} cy="152" rx="11" ry="13" fill="#FFFFFF" />
                    <circle cx={cx} cy="154" r="6.5" fill="#3A2A1E" />
                    <circle cx={cx + 2.4} cy="150.5" r="2.1" fill="#FFFFFF" />
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
              <ellipse cx="298" cy="394" rx="40" ry="11" fill="#E4DBFA" />
              <rect x="272" y="360" width="44" height="16" rx="4" fill="#F7B8CE" transform="rotate(-3 294 368)" />
              <rect x="274" y="344" width="40" height="16" rx="4" fill="#9BDCC4" transform="rotate(2 294 352)" />
              <g>
                <path d="M298 338 q-16 -8 -20 -28 q18 2 24 20 z" fill="#7FBF8B" />
                <path d="M298 338 q16 -6 22 -26 q-18 0 -26 18 z" fill="#8FCB99" />
                <ellipse cx="298" cy="340" rx="14" ry="10" fill="#C9BCEF" />
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
