import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Lightbulb, Menu, Plus, Shuffle, X, BookImage, RotateCcw, Home, Trash2 } from "lucide-react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LEVELS, LEVELS_PER_SCENE, sceneOf, solvedByPercent, type Level } from "./levels";
import { buildLayout, cellKey, cellsOf } from "./layout";
import {
  BONUS_EVERY,
  BONUS_PAYOUT,
  HINT_COST,
  LEVEL_REWARD,
  clearSave,
  freshSave,
  loadSave,
  persistSave,
  type ExpoSave,
} from "./storage";
import { LetterWheel, type WheelLetter } from "./LetterWheel";
import { Board } from "./Board";
import { CoinIcon } from "./CoinIcon";
import { LuckWheel } from "./LuckWheel";
import { describePrize, type Prize } from "./prizes";
import { Scrapbook } from "./Scrapbook";
import { BlueBanner } from "./BlueBanner";

/**
 * The Expo word-wheel mode.
 *
 * A photo, a crossword of dark tiles over it, and a wheel of letters below.
 * Drag across the wheel to spell a word: a board word fills its tiles, a
 * bonus word pays a little, anything else shakes. Every level is one wheel;
 * three levels make a scene, and finishing a scene adds its photo to the
 * scrapbook. Some levels end with a spin of the luck wheel.
 *
 * Everything is local (see storage.ts). The shell is a fixed-height box
 * that never scrolls, because the document cannot on iOS (CLAUDE.md 4b).
 */

type Feedback =
  | { kind: "correct" | "bonus" | "wrong" | "dup" | "poor"; word: string; id: number };

type Phase = "play" | "complete" | "luck" | "unlock";

const buzz = async (style: "light" | "medium" | "success" | "error") => {
  try {
    if (style === "success") await Haptics.notification({ type: NotificationType.Success });
    else if (style === "error") await Haptics.notification({ type: NotificationType.Error });
    else await Haptics.impact({ style: style === "light" ? ImpactStyle.Light : ImpactStyle.Medium });
  } catch {
    // Not on a device.
  }
};

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const levelAt = (n: number): Level => LEVELS[(n - 1) % LEVELS.length];

/** Luck wheel after every second level; a scrapbook page after every pack. */
const luckAfter = (level: Level) => level.number % 2 === 0;
const unlocksSceneAfter = (level: Level) => level.number % LEVELS_PER_SCENE === 0;

const circleButton =
  "flex h-12 w-12 items-center justify-center rounded-full text-white active:scale-95 transition-transform";

export default function ExpoGame() {
  const navigate = useNavigate();
  const [save, setSave] = useState<ExpoSave>(() => loadSave());
  useEffect(() => persistSave(save), [save]);

  const level = levelAt(save.level);
  const scene = sceneOf(level);
  const layout = useMemo(() => buildLayout(level.words), [level]);

  const [wheel, setWheel] = useState<WheelLetter[]>(() =>
    Array.from(level.letters).map((ch, id) => ({ id, ch })),
  );
  useEffect(() => {
    setWheel(Array.from(level.letters).map((ch, id) => ({ id, ch })));
  }, [level]);

  const [selected, setSelected] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wave, setWave] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("play");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrapbookOpen, setScrapbookOpen] = useState(false);
  const [coinsInfo, setCoinsInfo] = useState(false);
  const [lastPrize, setLastPrize] = useState<Prize | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const say = useCallback((kind: Feedback["kind"], word: string) => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setFeedback({ kind, word, id: Date.now() });
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), kind === "correct" ? 450 : 900);
  }, []);

  // Which cells show a letter: every found word's cells, plus hints.
  const revealed = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of layout.words) {
      if (!save.found.includes(p.word)) continue;
      for (const { row, col, letter } of cellsOf(p)) map.set(cellKey(row, col), letter);
    }
    for (const key of save.hinted) {
      const letter = layout.cells.get(key);
      if (letter) map.set(key, letter);
    }
    return map;
  }, [layout, save.found, save.hinted]);

  const allFound = layout.words.every((p) => save.found.includes(p.word));

  // The level ends a beat after its last word lands, so the wave finishes.
  useEffect(() => {
    if (!allFound || phase !== "play") return;
    const id = window.setTimeout(() => setPhase("complete"), 900);
    return () => window.clearTimeout(id);
  }, [allFound, phase]);

  /** Mark words whose every cell is now showing (a hint can finish one). */
  const withAutoFound = (s: ExpoSave, hinted: string[]): string[] => {
    const found = new Set(s.found);
    for (const p of layout.words) {
      if (found.has(p.word)) continue;
      const done = cellsOf(p).every(({ row, col }) => {
        const key = cellKey(row, col);
        return hinted.includes(key) || layout.words.some((q) => found.has(q.word) && cellsOf(q).some((c) => cellKey(c.row, c.col) === key));
      });
      if (done) found.add(p.word);
    }
    return Array.from(found);
  };

  const submit = useCallback(
    (indices: number[]) => {
      if (phase !== "play") return;
      const word = indices.map((i) => wheel[i].ch).join("");
      setSelected([]);

      if (word.length < 3) {
        say("poor", word);
        return;
      }

      const onBoard = layout.words.find((p) => p.word === word);
      if (onBoard) {
        if (save.found.includes(word)) {
          say("dup", word);
          void buzz("light");
          return;
        }
        setWave(cellsOf(onBoard).map((c) => cellKey(c.row, c.col)));
        setSave((s) => ({ ...s, found: [...s.found, word] }));
        say("correct", word);
        void buzz("success");
        return;
      }

      if (level.bonus.includes(word)) {
        if (save.bonusFound.includes(word)) {
          say("dup", word);
          void buzz("light");
          return;
        }
        setSave((s) => {
          const bonusTotal = s.bonusTotal + 1;
          const payout = bonusTotal % BONUS_EVERY === 0 ? BONUS_PAYOUT : 0;
          return { ...s, bonusFound: [...s.bonusFound, word], bonusTotal, coins: s.coins + payout };
        });
        say("bonus", word);
        void buzz("medium");
        return;
      }

      say("wrong", word);
      void buzz("error");
    },
    [phase, wheel, layout, save.found, save.bonusFound, level.bonus, say],
  );

  const hint = () => {
    if (phase !== "play") return;
    const hidden = Array.from(layout.cells.keys()).filter((k) => !revealed.has(k));
    if (hidden.length === 0) return;
    const canPay = save.freeHints > 0 || save.coins >= HINT_COST;
    if (!canPay) {
      say("poor", `Need ${HINT_COST} coins`);
      void buzz("error");
      return;
    }
    const key = hidden[Math.floor(Math.random() * hidden.length)];
    setWave([key]);
    setSave((s) => {
      const hinted = [...s.hinted, key];
      return {
        ...s,
        hinted,
        found: withAutoFound(s, hinted),
        freeHints: s.freeHints > 0 ? s.freeHints - 1 : s.freeHints,
        coins: s.freeHints > 0 ? s.coins : s.coins - HINT_COST,
      };
    });
    void buzz("medium");
  };

  const doShuffle = () => {
    setSelected([]);
    setWheel((w) => shuffle(w));
    void buzz("light");
  };

  const advance = () => {
    setSave((s) => ({
      ...s,
      level: s.level + 1,
      found: [],
      bonusFound: [],
      hinted: [],
    }));
    setWave([]);
    setLastPrize(null);
    setPhase("play");
  };

  /** From the level-complete card: pay out, then whatever comes next. */
  const continueFromComplete = () => {
    setSave((s) => {
      const scrapbook =
        unlocksSceneAfter(level) && !s.scrapbook.includes(scene.id) ? [...s.scrapbook, scene.id] : s.scrapbook;
      return { ...s, coins: s.coins + LEVEL_REWARD, scrapbook };
    });
    if (luckAfter(level)) setPhase("luck");
    else if (unlocksSceneAfter(level)) setPhase("unlock");
    else advance();
  };

  const collectPrize = (prize: Prize) => {
    setSave((s) =>
      prize.kind === "coins"
        ? { ...s, coins: s.coins + prize.amount }
        : { ...s, freeHints: s.freeHints + prize.amount },
    );
    setLastPrize(prize);
    void buzz("success");
    if (unlocksSceneAfter(level)) setPhase("unlock");
    else advance();
  };

  const restartLevel = () => {
    setSave((s) => ({ ...s, found: [], bonusFound: [], hinted: [] }));
    setWave([]);
    setPhase("play");
    setMenuOpen(false);
  };

  const resetAll = () => {
    clearSave();
    setSave(freshSave());
    setWave([]);
    setPhase("play");
    setMenuOpen(false);
  };

  // Sizing: the board gets whatever is left between the top bar and the
  // wheel, and the wheel is as big as the width allows without crowding.
  const [shellRef, shell] = useSize<HTMLDivElement>();
  const [boardRef, boardArea] = useSize<HTMLDivElement>();
  const wheelSize = Math.max(220, Math.min(shell.width - 96, shell.height * 0.4, 320));
  const gap = 4;
  const cellSize = Math.max(
    18,
    Math.min(
      46,
      Math.floor((boardArea.width - gap * (layout.cols - 1)) / Math.max(1, layout.cols)),
      Math.floor((boardArea.height - gap * (layout.rows - 1)) / Math.max(1, layout.rows)),
    ),
  );

  const currentWord = selected.map((i) => wheel[i]?.ch ?? "").join("");
  const pill = feedback ?? (currentWord ? { kind: "typing" as const, word: currentWord, id: 0 } : null);
  const pillStyle = (kind: string) => {
    if (kind === "dup" || kind === "poor") return { background: "rgba(35,35,45,0.85)" };
    if (kind === "bonus") return { background: "linear-gradient(180deg,#FFD84D,#F2A900)" };
    return { background: scene.accent };
  };

  const sceneIndex = (level.number - 1) % LEVELS_PER_SCENE;

  return (
    <div
      ref={shellRef}
      className="relative h-[100dvh] w-full overflow-hidden safe-bleed select-none text-white"
      style={{
        backgroundImage: `url(${scene.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* A whisper of dark so white type reads on a bright sky. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/30" />

      <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col px-4">
        {/* Top bar */}
        <div className="flex h-16 shrink-0 items-center justify-between">
          <button
            // A deep link has nothing behind it; home is the sensible back.
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            aria-label="Back"
            className={circleButton}
            style={{ background: scene.tile, boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={3} />
          </button>

          <button
            onClick={() => setCoinsInfo(true)}
            aria-label={`${save.coins} coins`}
            className="flex h-11 items-center gap-2 rounded-full pl-1 pr-1.5 active:scale-95 transition-transform"
            style={{ background: scene.tile, boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }}
          >
            <CoinIcon size={34} />
            <span className="min-w-[44px] text-center text-[22px] font-bold tabular-nums">{save.coins}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2FA33A]">
              <Plus className="h-4 w-4" strokeWidth={3.5} />
            </span>
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className={circleButton}
            style={{ background: scene.tile, boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }}
          >
            <Menu className="h-7 w-7" strokeWidth={3} />
          </button>
        </div>

        <div className="shrink-0 text-center text-[13px] font-bold uppercase tracking-[0.18em] text-white/85 drop-shadow">
          Level {level.number} · {scene.name} {sceneIndex + 1}/{LEVELS_PER_SCENE}
        </div>

        {/* Board */}
        <div ref={boardRef} className="flex min-h-0 flex-1 items-center justify-center py-3">
          {boardArea.width > 0 && (
            <Board
              layout={layout}
              revealed={revealed}
              wave={wave}
              cellSize={cellSize}
              gap={gap}
              accent={scene.accent}
              tile={scene.tile}
            />
          )}
        </div>

        {/* The word being spelled, or the verdict on the last one. */}
        <div className="flex h-[68px] shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout">
            {pill && (
              <motion.div
                key={pill.id === 0 ? "typing" : pill.id}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={
                  pill.kind === "wrong"
                    ? { scale: 1, opacity: 1, x: [0, -10, 10, -8, 8, -4, 0] }
                    : pill.kind === "correct"
                      ? { scale: 1.05, opacity: 1 }
                      : { scale: 1, opacity: 1 }
                }
                exit={
                  pill.kind === "correct"
                    ? { y: -90, opacity: 0, scale: 0.5, transition: { duration: 0.35 } }
                    : { opacity: 0, scale: 0.8, transition: { duration: 0.15 } }
                }
                // The shake is keyframes, which a spring cannot drive (Framer
                // Motion throws, and the thrown error leaves the pill stuck).
                transition={{
                  default: { type: "spring", stiffness: 500, damping: 30 },
                  x: { type: "tween", duration: 0.4, ease: "easeInOut" },
                }}
                className="rounded-full px-7 py-2 text-[38px] font-bold leading-none tracking-wide text-white"
                style={{
                  ...pillStyle(pill.kind),
                  boxShadow: "0 4px 0 rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.3)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }}
              >
                {pill.kind === "bonus" ? `${pill.word} · Bonus!` : pill.word}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wheel and its two buttons. Fades out under the end-of-level
            cards so its letters do not show through them. */}
        <div
          className="relative flex shrink-0 justify-center pb-[calc(0.75rem_+_var(--safe-bottom))] pt-1 transition-opacity duration-300"
          style={{ opacity: phase === "play" ? 1 : 0 }}
        >
          {shell.width > 0 && (
            <LetterWheel
              letters={wheel}
              size={wheelSize}
              accent={scene.accent}
              disc={scene.tile}
              disabled={phase !== "play"}
              onChange={setSelected}
              onSubmit={submit}
            />
          )}

          <button
            onClick={doShuffle}
            aria-label="Shuffle letters"
            className="absolute left-0 bottom-[calc(0.75rem_+_var(--safe-bottom))] flex h-[60px] w-[60px] items-center justify-center rounded-full text-white active:scale-95 transition-transform"
            style={{ background: scene.tile, boxShadow: "0 0 0 2px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.35)" }}
          >
            <Shuffle className="h-7 w-7" strokeWidth={2.6} />
          </button>

          <button
            onClick={hint}
            aria-label={save.freeHints > 0 ? "Use a free hint" : `Hint for ${HINT_COST} coins`}
            className="absolute right-0 bottom-[calc(0.75rem_+_var(--safe-bottom))] flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full text-white active:scale-95 transition-transform"
            style={{ background: scene.tile, boxShadow: "0 0 0 2px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.35)" }}
          >
            <Lightbulb className="h-6 w-6" strokeWidth={2.6} fill="white" />
            <span className="mt-0.5 flex items-center gap-0.5 text-[12px] font-bold leading-none">
              {save.freeHints > 0 ? (
                <>×{save.freeHints}</>
              ) : (
                <>
                  {HINT_COST}
                  <CoinIcon size={12} />
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end justify-center bg-black/55"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] rounded-t-[24px] bg-white px-5 pt-4 text-[#1B2A4A] pb-[calc(1.25rem_+_var(--safe-bottom))]"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/15" />
              <MenuRow icon={<BookImage className="h-5 w-5" />} label="Scrapbook" onClick={() => { setMenuOpen(false); setScrapbookOpen(true); }} />
              <MenuRow icon={<RotateCcw className="h-5 w-5" />} label="Restart level" onClick={restartLevel} />
              <MenuRow icon={<Home className="h-5 w-5" />} label="Back to MyTrivia" onClick={() => navigate("/")} />
              <MenuRow icon={<Trash2 className="h-5 w-5" />} label="Reset all progress" onClick={resetAll} danger />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coins explainer */}
      <AnimatePresence>
        {coinsInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 px-6"
            onClick={() => setCoinsInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[360px] rounded-[22px] bg-white p-6 text-center text-[#1B2A4A]"
            >
              <div className="mx-auto mb-3 flex justify-center"><CoinIcon size={56} /></div>
              <div className="text-[24px] font-extrabold">Coins</div>
              <p className="mt-2 text-[15px] leading-snug text-[#1B2A4A]/80">
                Solve a level for +{LEVEL_REWARD}. Every {BONUS_EVERY} bonus words pay +{BONUS_PAYOUT}.
                Spin the luck wheel after every second level. A hint costs {HINT_COST}.
              </p>
              <button
                onClick={() => setCoinsInfo(false)}
                className="mt-5 w-full rounded-[16px] bg-[#2FA33A] py-3 text-[18px] font-bold text-white"
                style={{ boxShadow: "0 4px 0 #1E7A2A" }}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level complete */}
      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.8) 100%)" }}
          >
            <BlueBanner>
              Solved by
              <br />
              {solvedByPercent(level)}% Players
            </BlueBanner>
            <div className="flex flex-1 flex-col items-center justify-end pb-[calc(2rem_+_var(--safe-bottom))] px-6">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.15 }}
                className="mb-6 flex flex-col items-center"
              >
                <div className="text-[30px] font-extrabold drop-shadow-md">Level {level.number} complete!</div>
                <div className="mt-2 flex items-center gap-2 rounded-full px-5 py-2 text-[26px] font-bold" style={{ background: "rgba(0,0,0,0.45)" }}>
                  +{LEVEL_REWARD} <CoinIcon size={30} />
                </div>
                {save.bonusFound.length > 0 && (
                  <div className="mt-2 text-[15px] font-semibold text-white/85">
                    {save.bonusFound.length} bonus {save.bonusFound.length === 1 ? "word" : "words"} found
                  </div>
                )}
              </motion.div>
              <button
                onClick={continueFromComplete}
                className="w-full max-w-[320px] rounded-[18px] py-3.5 text-[28px] font-bold text-white"
                style={{
                  background: "linear-gradient(180deg,#5BD35B 0%,#2FA33A 100%)",
                  boxShadow: "0 5px 0 #1E7A2A, 0 10px 24px rgba(0,0,0,0.35)",
                }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luck wheel */}
      <AnimatePresence>
        {phase === "luck" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col bg-black/70"
          >
            <BlueBanner>
              Test Your
              <br />
              Luck
            </BlueBanner>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[calc(1rem_+_var(--safe-bottom))]">
              <LuckWheel size={Math.min(shell.width - 64, 320)} onDone={collectPrize} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A scene finished: its photo joins the scrapbook. */}
      <AnimatePresence>
        {phase === "unlock" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col"
            style={{ background: "linear-gradient(180deg,#0F2B66 0%,#0A1B40 100%)" }}
          >
            <BlueBanner>
              Build Your Own
              <br />
              Scrapbook
            </BlueBanner>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[calc(1.5rem_+_var(--safe-bottom))]">
              {lastPrize && (
                <div className="mb-4 text-[16px] font-semibold text-white/80">You won {describePrize(lastPrize)}</div>
              )}
              <motion.div
                initial={{ rotate: -6, scale: 0.7, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="relative w-full max-w-[320px] overflow-hidden rounded-[12px]"
                style={{ aspectRatio: "4 / 3", boxShadow: "0 0 0 3px rgba(255,255,255,0.8), 0 12px 32px rgba(0,0,0,0.5)" }}
              >
                <img src={scene.image} alt={scene.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                <div className="absolute inset-x-0 bottom-0 py-2 text-center text-[28px] font-medium" style={{ background: "rgba(20,30,50,0.62)" }}>
                  {scene.name}
                </div>
              </motion.div>
              <div className="mt-5 text-center text-[18px] font-bold">{scene.name} added to your scrapbook</div>
              <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
                <button
                  onClick={advance}
                  className="w-full rounded-[18px] py-3.5 text-[26px] font-bold text-white"
                  style={{ background: "linear-gradient(180deg,#5BD35B 0%,#2FA33A 100%)", boxShadow: "0 5px 0 #1E7A2A, 0 10px 24px rgba(0,0,0,0.35)" }}
                >
                  Next scene
                </button>
                <button
                  onClick={() => setScrapbookOpen(true)}
                  className="w-full rounded-[18px] bg-white/15 py-3 text-[18px] font-bold text-white"
                >
                  View scrapbook
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scrapbookOpen && <Scrapbook unlocked={save.scrapbook} onClose={() => setScrapbookOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-3.5 text-left text-[17px] font-bold active:bg-black/5 ${
        danger ? "text-[#C0392B]" : "text-[#1B2A4A]"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5">{icon}</span>
      {label}
      <X className="ml-auto h-0 w-0 opacity-0" aria-hidden />
    </button>
  );
}
