import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookImage, Lightbulb, LogOut, Menu, Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useCurrency } from "@/hooks/useCurrency";
import { GameModal, GameModalStat } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { portal } from "@/lib/overlayPortal";
import coinIcon from "@/assets/icons/icon-coin.png";
import { LEVELS_PER_SCENE, bankLanguage, loadLevels, sceneOf, solvedByPercent, type Level, type WordsLanguage } from "./levels";
import { buildLayout, cellKey, cellsOf } from "./layout";
import {
  BONUS_EVERY,
  BONUS_PAYOUT,
  HINT_COST,
  LEVEL_REWARD,
  clearSave,
  freshProgress,
  freshSave,
  loadSave,
  persistSave,
  type WordsSave,
} from "./storage";
import { emptyShared, mergeShared, type SharedState } from "./shared";
import { loadSharedState, persistSharedState, useWordsRoom, type Seat } from "./useWordsRoom";
import { LetterWheel, type WheelLetter } from "./LetterWheel";
import { Board } from "./Board";
import { LuckWheel } from "./LuckWheel";
import { describePrize, type Prize } from "./prizes";
import { Scrapbook } from "./Scrapbook";

/**
 * Words.
 *
 * A photo, a crossword of dark tiles over it, a wheel of letters below.
 * Drag across the wheel to spell a word: a board word fills its tiles, a
 * bonus word pays a little, anything else shakes. Every level is one wheel;
 * three levels make a scene, and a finished scene joins the scrapbook.
 *
 * Played alone, or with one friend on the same board: you sit top-left,
 * they sit top-right, and every word either of you finds lands for both.
 * The room and the invite are the app's own (useWordsRoom); the board's
 * state rides a realtime channel and needs no server.
 *
 * The shell is a fixed-height box that never scrolls, because the document
 * cannot on iOS (CLAUDE.md 4b).
 */

type Feedback = { kind: "correct" | "bonus" | "wrong" | "dup" | "poor" | "friend"; text: string; id: number };
type Phase = "play" | "complete" | "luck" | "unlock";

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

const levelAt = (bank: Level[], n: number): Level => bank[(n - 1) % bank.length];

/** A placeholder board while a language's bank is on its way. */
const LOADING_LEVEL: Level = { number: 1, sceneId: "mountain", letters: "", words: [], bonus: [] };

/** Luck wheel after every second level; a scrapbook page after every pack. */
const luckAfter = (level: Level) => level.number % 2 === 0;
const unlocksSceneAfter = (level: Level) => level.number % LEVELS_PER_SCENE === 0;

const SOLO = "me";

/** The in-game round control — the same glass circle the quiz screens use. */
const roundButton =
  "flex items-center justify-center rounded-full bg-[#402666]/70 text-white backdrop-blur-sm shadow-[0_3px_0_rgba(64,38,102,0.45)] active:scale-95 transition-transform";

export default function WordsGame() {
  const { t, language } = useLanguage();
  const appLang = bankLanguage(language);
  const navigate = useNavigate();
  const location = useLocation();
  const { code: codeParam } = useParams<{ code?: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { playSound, vibrate } = useSound();
  const wallet = useCurrency();
  const myId = user?.id ?? SOLO;

  // ---- local save (solo progress, hints, scrapbook, guest coins) ----
  const [save, setSave] = useState<WordsSave>(() => loadSave());
  useEffect(() => persistSave(save), [save]);

  // ---- the board's state, shared or not ----
  // Solo play is in the app's language; a shared board is in the room's,
  // which the join exchange delivers (a join link opened in another
  // language still shows the host's board).
  const [shared, setShared] = useState<SharedState>(() => {
    if (codeParam) return loadSharedState(codeParam) ?? emptyShared(1, appLang);
    const p = loadSave().progress[appLang] ?? freshProgress();
    return {
      lang: appLang,
      level: p.level,
      found: Object.fromEntries(p.found.map((w) => [w, SOLO])),
      bonus: Object.fromEntries(p.bonusFound.map((w) => [w, SOLO])),
      hinted: p.hinted,
      rev: 0,
    };
  });
  const sharedRef = useRef(shared);
  sharedRef.current = shared;

  // A solo player who switches the app's language moves to that bank, at
  // wherever they were in it.
  useEffect(() => {
    if (codeParam || roomRef.current || sharedRef.current.lang === appLang) return;
    const p = loadSave().progress[appLang] ?? freshProgress();
    const next: SharedState = {
      lang: appLang,
      level: p.level,
      found: Object.fromEntries(p.found.map((w) => [w, SOLO])),
      bonus: Object.fromEntries(p.bonusFound.map((w) => [w, SOLO])),
      hinted: p.hinted,
      rev: sharedRef.current.rev + 1,
    };
    sharedRef.current = next;
    setShared(next);
    setPhase("play");
    setWave([]);
  }, [appLang, codeParam]);

  // ---- the level bank for the board's language ----
  const [bank, setBank] = useState<{ lang: WordsLanguage; levels: Level[] } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadLevels(shared.lang).then((levels) => {
      if (alive) setBank({ lang: shared.lang, levels });
    });
    return () => {
      alive = false;
    };
  }, [shared.lang]);
  const bankReady = bank?.lang === shared.lang;

  const [phase, setPhase] = useState<Phase>("play");
  const [wave, setWave] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrapbookOpen, setScrapbookOpen] = useState(false);
  const [coinsInfo, setCoinsInfo] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteOpening, setInviteOpening] = useState(false);
  const [lastPrize, setLastPrize] = useState<Prize | null>(null);
  const [roomGone, setRoomGone] = useState(false);
  const feedbackTimer = useRef<number | null>(null);

  const say = useCallback((kind: Feedback["kind"], text: string) => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setFeedback({ kind, text, id: Date.now() });
    feedbackTimer.current = window.setTimeout(
      () => setFeedback(null),
      kind === "correct" ? 450 : kind === "friend" ? 1400 : 900,
    );
  }, []);

  // ---- the room, when there is one ----
  const roomRef = useRef<{ code: string } | null>(null);
  const room = useWordsRoom({
    code: codeParam ?? null,
    onMissing: () => setRoomGone(true),
    onRoomReady: (r) => {
      roomRef.current = { code: r.room_code };
      // A room made from a solo board carries that board along.
      persistSharedState(r.room_code, sharedRef.current);
      if (!codeParam) navigate(`/words/${r.room_code}`, { replace: true });
    },
    getState: () => sharedRef.current,
    onIncoming: (incoming) => {
      const before = sharedRef.current;
      const next = mergeShared(before, incoming);
      setShared(next);
      if (roomRef.current) persistSharedState(roomRef.current.code, next);
      if (next.level > before.level || next.lang !== before.lang) {
        // The friend moved on (or the room's board is in another language
        // than ours); follow them.
        setPhase("play");
        setWave([]);
        setLastPrize(null);
        return;
      }
      // Their new words land with the same wave ours do.
      const theirs = Object.keys(next.found).filter((w) => !(w in before.found) && next.found[w] !== myId);
      if (theirs.length > 0) {
        const p = layoutRef.current.words.find((x) => x.word === theirs[theirs.length - 1]);
        if (p) setWave(cellsOf(p).map((c) => cellKey(c.row, c.col)));
        const who = seatsRef.current.find((s) => s.userId === next.found[theirs[theirs.length - 1]]);
        say("friend", t("words.foundBy", { name: who?.nickname ?? "", word: theirs[theirs.length - 1] }));
        playSound("room-message");
      }
    },
    onFriendJoined: (seat: Seat) => {
      say("friend", t("words.joined", { name: seat.nickname }));
      playSound("room-join");
      vibrate([30, 20, 90]);
    },
  });
  const seatsRef = useRef(room.seats);
  seatsRef.current = room.seats;
  useEffect(() => {
    if (room.room) roomRef.current = { code: room.room.room_code };
  }, [room.room]);

  // A friend picked on the create screen rides along in router state and is
  // invited the moment this board's room exists.
  const handoffRef = useRef<{ id: string; nickname: string; avatarUrl: string | null }[] | null>(
    (location.state as { invite?: { id: string; nickname: string; avatarUrl: string | null }[] } | null)?.invite ??
      null,
  );
  useEffect(() => {
    const list = handoffRef.current;
    if (!user || !profile || !list || list.length === 0) return;
    handoffRef.current = null;
    void (async () => {
      await room.invite(list[0]);
    })();
  }, [user, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // A join link needs an account: the seat is a participant row.
  useEffect(() => {
    if (codeParam && !authLoading && !user) setAuthOpen(true);
  }, [codeParam, authLoading, user]);

  // ---- the level ----
  const level = bankReady && bank ? levelAt(bank.levels, shared.level) : LOADING_LEVEL;
  const scene = sceneOf(level);
  const layout = useMemo(() => buildLayout(level.words), [level]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [wheel, setWheel] = useState<WheelLetter[]>(() =>
    Array.from(level.letters).map((ch, id) => ({ id, ch })),
  );
  useEffect(() => {
    setWheel(Array.from(level.letters).map((ch, id) => ({ id, ch })));
  }, [level]);

  /** Every change to the board goes through here: state, save, peer. */
  const commit = useCallback(
    (updater: (s: SharedState) => SharedState) => {
      const next = { ...updater(sharedRef.current) };
      next.rev = sharedRef.current.rev + 1;
      sharedRef.current = next;
      setShared(next);
      if (roomRef.current) {
        persistSharedState(roomRef.current.code, next);
        room.broadcast(next);
      } else {
        setSave((s) => ({
          ...s,
          progress: {
            ...s.progress,
            [next.lang]: {
              level: next.level,
              found: Object.keys(next.found),
              bonusFound: Object.keys(next.bonus),
              hinted: next.hinted,
            },
          },
        }));
      }
    },
    [room],
  );

  // Which cells show a letter: every found word's cells, plus hints.
  const revealed = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of layout.words) {
      if (!(p.word in shared.found)) continue;
      for (const { row, col, letter } of cellsOf(p)) map.set(cellKey(row, col), letter);
    }
    for (const key of shared.hinted) {
      const letter = layout.cells.get(key);
      if (letter) map.set(key, letter);
    }
    return map;
  }, [layout, shared.found, shared.hinted]);

  const allFound = bankReady && layout.words.length > 0 && layout.words.every((p) => p.word in shared.found);

  // ---- scores ----
  const countFor = (id: string) =>
    Object.values(shared.found).filter((v) => v === id).length + Object.values(shared.bonus).filter((v) => v === id).length;
  const myScore = countFor(myId) + (myId !== SOLO ? countFor(SOLO) : 0);
  const friendScore = room.friend ? countFor(room.friend.userId) : 0;

  // ---- coins: the real wallet when signed in, a local purse for a guest ----
  const coins = user ? wallet.coins : save.coins;
  const creditedRef = useRef<Set<string>>(new Set());
  const credit = useCallback(
    (amount: number, kind: "quiz_reward" | "spin", reference: string) => {
      if (creditedRef.current.has(reference)) return;
      creditedRef.current.add(reference);
      if (user) void wallet.addCoins(amount, kind, reference);
      else setSave((s) => ({ ...s, coins: s.coins + amount }));
    },
    [user, wallet],
  );

  // The level ends a beat after its last word lands, so the wave finishes.
  useEffect(() => {
    if (!allFound || phase !== "play") return;
    const id = window.setTimeout(() => {
      setPhase("complete");
      playSound("level-up");
      vibrate([60, 40, 200]);
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.45, x: 0.5 } });
      window.setTimeout(() => {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.55, x: 0.25 } });
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.55, x: 0.75 } });
      }, 250);
    }, 900);
    return () => window.clearTimeout(id);
  }, [allFound, phase, playSound, vibrate]);

  /** Mark words whose every cell is now showing (a hint can finish one). */
  const withAutoFound = (s: SharedState): Record<string, string> => {
    const found = { ...s.found };
    for (const p of layout.words) {
      if (p.word in found) continue;
      const done = cellsOf(p).every(({ row, col }) => {
        const key = cellKey(row, col);
        return (
          s.hinted.includes(key) ||
          layout.words.some((q) => q.word in found && cellsOf(q).some((c) => cellKey(c.row, c.col) === key))
        );
      });
      if (done) found[p.word] = myId;
    }
    return found;
  };

  const submit = useCallback(
    (indices: number[]) => {
      if (phase !== "play") return;
      const word = indices.map((i) => wheel[i].ch).join("");
      setSelected([]);

      if (word.length < 3) {
        say("poor", t("words.tooShort"));
        return;
      }

      const onBoard = layout.words.find((p) => p.word === word);
      if (onBoard) {
        if (word in sharedRef.current.found) {
          say("dup", t("words.alreadyFound"));
          vibrate(20);
          return;
        }
        setWave(cellsOf(onBoard).map((c) => cellKey(c.row, c.col)));
        commit((s) => ({ ...s, found: { ...s.found, [word]: myId } }));
        say("correct", word);
        playSound("correct-answer");
        vibrate([30, 20, 90]);
        return;
      }

      if (level.bonus.includes(word)) {
        if (word in sharedRef.current.bonus) {
          say("dup", t("words.alreadyFound"));
          vibrate(20);
          return;
        }
        commit((s) => ({ ...s, bonus: { ...s.bonus, [word]: myId } }));
        setSave((s) => {
          const bonusTotal = s.bonusTotal + 1;
          if (bonusTotal % BONUS_EVERY === 0) credit(BONUS_PAYOUT, "quiz_reward", `words:bonus:${Date.now()}`);
          return { ...s, bonusTotal };
        });
        say("bonus", `${word} · ${t("words.bonus")}`);
        playSound("reward");
        vibrate([30, 20, 90]);
        return;
      }

      say("wrong", word);
      playSound("wrong-answer");
      vibrate([100, 40, 160]);
    },
    [phase, wheel, layout, level.bonus, say, t, commit, myId, playSound, vibrate, credit],
  );

  const hint = async () => {
    if (phase !== "play") return;
    const hidden = Array.from(layout.cells.keys()).filter((k) => !revealed.has(k));
    if (hidden.length === 0) return;
    playSound("button-click");

    if (save.freeHints > 0) {
      setSave((s) => ({ ...s, freeHints: s.freeHints - 1 }));
    } else if (user) {
      const ok = await wallet.spendCoins(HINT_COST, {
        productType: "words_hint",
        valueReceived: { hint: 1 },
      });
      if (!ok) {
        say("poor", t("words.needCoins", { n: HINT_COST }));
        vibrate([100, 40, 160]);
        return;
      }
    } else if (save.coins >= HINT_COST) {
      setSave((s) => ({ ...s, coins: s.coins - HINT_COST }));
    } else {
      say("poor", t("words.needCoins", { n: HINT_COST }));
      vibrate([100, 40, 160]);
      return;
    }

    const key = hidden[Math.floor(Math.random() * hidden.length)];
    setWave([key]);
    commit((s) => {
      const next = { ...s, hinted: [...s.hinted, key] };
      return { ...next, found: withAutoFound(next) };
    });
    vibrate(40);
  };

  const doShuffle = () => {
    setSelected([]);
    setWheel((w) => shuffle(w));
    playSound("button-click");
    vibrate(20);
  };

  const advance = () => {
    setWave([]);
    setLastPrize(null);
    setPhase("play");
    commit((s) => ({ ...emptyShared(s.level + 1, s.lang), rev: s.rev }));
  };

  /** From the level-complete card: pay out, then whatever comes next. */
  const continueFromComplete = () => {
    credit(LEVEL_REWARD, "quiz_reward", `words:${roomRef.current?.code ?? "solo"}:${level.number}:${myId}`);
    setSave((s) => ({
      ...s,
      scrapbook:
        unlocksSceneAfter(level) && !s.scrapbook.includes(scene.id) ? [...s.scrapbook, scene.id] : s.scrapbook,
    }));
    playSound("button-click");
    if (luckAfter(level)) setPhase("luck");
    else if (unlocksSceneAfter(level)) setPhase("unlock");
    else advance();
  };

  const collectPrize = (prize: Prize) => {
    if (prize.kind === "coins") credit(prize.amount, "spin", `words:spin:${Date.now()}`);
    else setSave((s) => ({ ...s, freeHints: s.freeHints + prize.amount }));
    setLastPrize(prize);
    if (unlocksSceneAfter(level)) setPhase("unlock");
    else advance();
  };

  const restartLevel = () => {
    setWave([]);
    setPhase("play");
    setMenuOpen(false);
    playSound("button-click");
    commit((s) => ({ ...emptyShared(s.level, s.lang), rev: s.rev }));
  };

  const resetAll = () => {
    clearSave();
    setSave(freshSave());
    setWave([]);
    setPhase("play");
    setResetAsk(false);
    setMenuOpen(false);
    if (roomRef.current) commit((s) => ({ ...emptyShared(1, s.lang), rev: s.rev }));
    else {
      const fresh = emptyShared(1, appLang);
      sharedRef.current = fresh;
      setShared(fresh);
    }
  };

  const goBack = () => {
    playSound("button-click");
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // ---- inviting: one tap, the app's own invite modal ----
  // The modal needs a room to seat people in, so the first tap makes it.
  // From there the modal does everything the lounges do: search, the
  // friends list, the share link, and on send the seat row (bell) plus the
  // invitation row (push) — instantly, per friend.
  const openInvite = async () => {
    playSound("button-click");
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (inviteOpening) return;
    setInviteOpening(true);
    try {
      const target = room.room ?? (await room.createRoom());
      if (target) setInviteModalOpen(true);
    } finally {
      setInviteOpening(false);
    }
  };

  // ---- sizing ----
  const [shellRef, shell] = useSize<HTMLDivElement>();
  const [boardRef, boardArea] = useSize<HTMLDivElement>();
  const wheelSize = Math.max(220, Math.min(shell.width - 96, shell.height * 0.38, 320));
  const gap = 4;
  const cellSize = Math.max(
    18,
    Math.min(
      44,
      Math.floor((boardArea.width - gap * (layout.cols - 1)) / Math.max(1, layout.cols)),
      Math.floor((boardArea.height - gap * (layout.rows - 1)) / Math.max(1, layout.rows)),
    ),
  );

  const currentWord = selected.map((i) => wheel[i]?.ch ?? "").join("");
  const pill = feedback ?? (currentWord ? { kind: "typing" as const, text: currentWord, id: 0 } : null);
  const pillStyle = (kind: string) => {
    if (kind === "dup" || kind === "poor") return { background: "rgba(35,35,45,0.85)" };
    if (kind === "bonus") return { background: "linear-gradient(180deg,#FFD84D,#F2A900)" };
    if (kind === "friend") return { background: "rgba(74,222,128,0.92)" };
    return { background: scene.accent };
  };

  const sceneIndex = (level.number - 1) % LEVELS_PER_SCENE;
  const myName = profile?.nickname || t("words.youLabel");

  return (
    <div
      ref={shellRef}
      className="relative h-[100dvh] w-full overflow-hidden select-none text-white"
      style={{
        backgroundImage: `url(${scene.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        // Full-bleed (the photo reaches the status bar) with the contents
        // pushed below it — the same trick Game.tsx uses — plus a little
        // extra so the round buttons sit clear of the notch and the clock.
        marginTop: "calc(-1 * var(--safe-top))",
        paddingTop: "calc(var(--safe-top) + 10px)",
      }}
    >
      {/* A whisper of dark so white type reads on a bright sky. */}
      {/* The scenes are pale lilac; a faint wash keeps white type legible on
          the brightest of them without dimming the picture. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#402666]/25 via-transparent to-[#402666]/30" />

      <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col px-4">
        {/* Header, the lounges' shape: back, a centred title, menu. The
            level sits under the title so the row stays quiet. */}
        <div className="relative mt-1 flex h-[56px] shrink-0 items-center justify-between">
          <motion.button whileTap={{ scale: 0.82 }} onClick={goBack} aria-label={t("common.back")} className={`${roundButton} h-10 w-10`}>
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-14">
            <div
              className="truncate text-[24px] leading-[26px] text-white [text-shadow:0_2px_8px_rgba(23,10,54,0.45)]"
              style={{ fontFamily: "'TASolivare', 'Nunito', sans-serif" }}
            >
              {t("words.title")}
            </div>
            <div className="mt-0.5 truncate font-['Nunito'] text-[12px] font-bold uppercase tracking-wider text-white/85 [text-shadow:0_1px_6px_rgba(23,10,54,0.45)]">
              {t("words.levelLabel", { n: level.number })} · {t("words.sceneProgress", { scene: t(scene.nameKey), i: sceneIndex + 1, total: LEVELS_PER_SCENE })}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.82 }} onClick={() => { playSound("button-click"); setMenuOpen(true); }} aria-label={t("words.menu")} className={`${roundButton} h-10 w-10`}>
            <Menu className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Players: you on the left, your friend (or the open seat) on the
            right, the purse between them. */}
        <div className="mt-2 flex shrink-0 items-start justify-between px-1">
          <div className="flex w-[64px] flex-col items-center" title={myName}>
            <QuizPlayerAvatar
              avatarUrl={profile?.avatar_url}
              animatedAvatarUrl={profile?.animated_avatar_url}
              score={myScore}
              position="left"
              state={room.room ? "active" : "default"}
            />
          </div>

          <button
            onClick={() => {
              playSound("button-click");
              setCoinsInfo(true);
            }}
            aria-label={`${coins} ${t("words.coinsTitle")}`}
            className="mt-1 flex h-10 items-center gap-1.5 rounded-full pl-1.5 pr-4 active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(180deg,#bb95ef 0%,#9a6fdc 58%,#8a5ed1 100%)",
              border: "1.5px solid #cbb0f4",
              boxShadow: "0px 4px 0px 0px #7a51b8, 0px 8px 16px rgba(102,51,153,0.3), inset 0px 2px 0px rgba(255,255,255,0.45)",
            }}
          >
            <img src={coinIcon} alt="" className="h-7 w-7" draggable={false} />
            <span className="font-['Nunito'] text-[17px] font-black tabular-nums">{coins.toLocaleString()}</span>
          </button>

          <div className="flex w-[64px] flex-col items-center">
            {room.friend ? (
              <div className={room.friend.pending ? "opacity-60" : ""} title={room.friend.nickname}>
                <QuizPlayerAvatar
                  avatarUrl={room.friend.avatarUrl}
                  animatedAvatarUrl={room.friend.animatedAvatarUrl}
                  score={friendScore}
                  position="right"
                  state={room.friend.pending ? "loading" : room.friendOnline ? "active" : "default"}
                />
              </div>
            ) : (
              <motion.button
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.82 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                onClick={() => void openInvite()}
                disabled={inviteOpening}
                aria-label={t("words.inviteFriend")}
                className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full border-[3px] border-[#9C99E8] bg-[rgba(51,192,84,0.75)] shadow-[0_4px_0_#1E9A7F] disabled:opacity-70"
              >
                <motion.div animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                  <Plus className="h-7 w-7 text-white" strokeWidth={3} />
                </motion.div>
              </motion.button>
            )}
          </div>
        </div>

        {/* Board */}
        <div ref={boardRef} className="flex min-h-0 flex-1 items-center justify-center py-2">
          {boardArea.width > 0 && bankReady && (
            <Board layout={layout} revealed={revealed} wave={wave} cellSize={cellSize} gap={gap} accent={scene.accent} tile={scene.tile} />
          )}
        </div>

        {/* The word being spelled, or the verdict on the last one. */}
        <div className="flex h-[64px] shrink-0 items-center justify-center">
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
                // The shake is keyframes, which a spring cannot drive.
                transition={{
                  default: { type: "spring", stiffness: 500, damping: 30 },
                  x: { type: "tween", duration: 0.4, ease: "easeInOut" },
                }}
                className={`max-w-full truncate rounded-full px-6 py-2 font-['Nunito'] font-black leading-none tracking-wide text-white ${
                  pill.kind === "friend" || pill.kind === "poor" || pill.kind === "dup" ? "text-[17px]" : "text-[32px]"
                }`}
                style={{
                  ...pillStyle(pill.kind),
                  boxShadow: "0 4px 0 rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.3)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }}
              >
                {pill.text}
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
          {shell.width > 0 && bankReady && (
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

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={doShuffle}
            aria-label={t("words.shuffle")}
            className={`${roundButton} absolute bottom-[calc(0.75rem_+_var(--safe-bottom))] left-0 h-[56px] w-[56px] border border-white/40`}
          >
            <Shuffle className="h-6 w-6" strokeWidth={2.6} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => void hint()}
            aria-label={t("words.hint")}
            className={`${roundButton} absolute bottom-[calc(0.75rem_+_var(--safe-bottom))] right-0 h-[56px] w-[56px] flex-col border border-white/40`}
          >
            <Lightbulb className="h-5 w-5" strokeWidth={2.6} fill="white" />
            <span className="mt-0.5 flex items-center gap-0.5 font-['Nunito'] text-[11px] font-black leading-none">
              {save.freeHints > 0 ? (
                t("words.freeHints", { n: save.freeHints })
              ) : (
                <>
                  {HINT_COST}
                  <img src={coinIcon} alt="" className="h-3 w-3" draggable={false} />
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Inviting: the app's own modal, sending seat + push as friends are picked */}
      {room.room && (
        <InviteFriendsModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          inviteLink={`https://mytrivia.io/words/${room.room.room_code}`}
          roomId={room.room.id}
          roomCode={room.room.room_code}
          onInviteSuccess={() => setInviteModalOpen(false)}
        />
      )}

      <AuthRequiredModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        returnToPath={codeParam ? `/words/${codeParam}` : "/words"}
        message={t("words.signInToInvite")}
      />

      {/* Menu — the app's light bottom sheet */}
      {portal(
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 safe-screen z-[110] flex items-end justify-center bg-black/50 sm:items-center"
              onClick={() => setMenuOpen(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] rounded-t-[28px] bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground sm:rounded-[28px]"
              >
                <h2 className="mb-3 font-display text-lg font-bold text-foreground">{t("words.title")}</h2>
                <div className="flex flex-col gap-1">
                  <MenuRow icon={<BookImage className="h-5 w-5" />} label={t("words.scrapbook")} onClick={() => { setMenuOpen(false); setScrapbookOpen(true); }} />
                  <MenuRow icon={<RotateCcw className="h-5 w-5" />} label={t("words.restartLevel")} onClick={restartLevel} />
                  <MenuRow icon={<LogOut className="h-5 w-5" />} label={t("words.leaveGame")} onClick={() => navigate("/")} />
                  <MenuRow icon={<Trash2 className="h-5 w-5" />} label={t("words.resetProgress")} onClick={() => setResetAsk(true)} danger />
                </div>
                <button onClick={() => setMenuOpen(false)} className="mt-2 h-12 w-full rounded-2xl font-semibold text-muted-foreground">
                  {t("common.close")}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
      )}

      <GameModal
        isOpen={resetAsk}
        onClose={() => setResetAsk(false)}
        fullScreen={false}
        variant="primary"
        title={t("words.resetProgress")}
        subtitle={t("words.resetConfirm")}
        primaryLabel={t("words.resetProgress")}
        onPrimaryClick={resetAll}
        secondaryLabel={t("common.cancel")}
        onSecondaryClick={() => setResetAsk(false)}
      />

      <GameModal
        isOpen={coinsInfo}
        onClose={() => setCoinsInfo(false)}
        fullScreen={false}
        variant="gold"
        iconSrc={coinIcon}
        title={t("words.coinsTitle")}
        subtitle={t("words.coinsInfo", { level: LEVEL_REWARD, every: BONUS_EVERY, bonus: BONUS_PAYOUT, hint: HINT_COST })}
        primaryLabel={t("words.gotIt")}
        onPrimaryClick={() => setCoinsInfo(false)}
      />

      {/* Level complete */}
      <GameModal
        isOpen={phase === "complete"}
        fullScreen={false}
        variant="success"
        showSparkles
        hideCloseButton
        disableBackdropClick
        iconEmoji="🎉"
        title={t("words.levelComplete", { n: level.number })}
        subtitle={t("words.solvedBy", { pct: solvedByPercent(level) })}
        primaryLabel={t("words.continue")}
        onPrimaryClick={continueFromComplete}
      >
        <div className="grid grid-cols-2 gap-2">
          <GameModalStat icon={<img src={coinIcon} alt="" className="h-6 w-6" />} value={`+${LEVEL_REWARD}`} label={t("words.coinsTitle")} highlight />
          <GameModalStat icon={<span className="text-xl">✨</span>} value={Object.keys(shared.bonus).length} label={t("words.bonus")} />
        </div>
        {room.friend && !room.friend.pending && (
          <div className="mt-4 flex items-center justify-center gap-6 text-sm font-semibold text-gray-600">
            <span>{myName}: {myScore}</span>
            <span>{room.friend.nickname}: {friendScore}</span>
          </div>
        )}
      </GameModal>

      {/* Luck wheel */}
      <GameModal
        isOpen={phase === "luck"}
        fullScreen={false}
        variant="gold"
        showStars
        hideCloseButton
        hideFooter
        disableBackdropClick
        title={t("words.testYourLuck")}
      >
        <div className="flex justify-center pt-2">
          <LuckWheel size={Math.min(shell.width - 96, 260)} onDone={collectPrize} />
        </div>
      </GameModal>

      {/* A scene finished: its photo joins the scrapbook */}
      <GameModal
        isOpen={phase === "unlock"}
        fullScreen={false}
        variant="info"
        showSparkles
        hideCloseButton
        disableBackdropClick
        title={t("words.scrapbookTitle")}
        subtitle={lastPrize ? t("words.youWon", { prize: describePrize(t, lastPrize) }) : undefined}
        primaryLabel={t("words.nextScene")}
        onPrimaryClick={advance}
        secondaryLabel={t("words.viewScrapbook")}
        onSecondaryClick={() => setScrapbookOpen(true)}
      >
        <motion.div
          initial={{ rotate: -6, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          className="relative mx-auto w-full overflow-hidden rounded-2xl border-[3px] border-white"
          style={{ aspectRatio: "4 / 3", boxShadow: "0 6px 0 #E8E4EC, 0 12px 32px rgba(102,51,153,0.18)" }}
        >
          <img src={scene.image} alt={t(scene.nameKey)} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-x-0 bottom-0 py-2 text-center font-display text-xl font-bold text-white" style={{ background: "rgba(20,30,50,0.62)" }}>
            {t(scene.nameKey)}
          </div>
        </motion.div>
        <p className="mt-3 text-center text-sm font-semibold text-gray-600">{t("words.sceneUnlocked", { scene: t(scene.nameKey) })}</p>
      </GameModal>

      <Scrapbook isOpen={scrapbookOpen} unlocked={save.scrapbook} onClose={() => setScrapbookOpen(false)} />

      <GameModal
        isOpen={roomGone}
        fullScreen={false}
        variant="primary"
        hideCloseButton
        disableBackdropClick
        title={t("words.title")}
        subtitle={t("words.roomGone")}
        primaryLabel={t("words.continue")}
        onPrimaryClick={() => navigate("/words", { replace: true })}
      />
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
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left font-medium hover:bg-muted active:bg-muted ${
        danger ? "text-destructive" : "text-foreground"
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${danger ? "bg-destructive/10" : "bg-primary/10 text-primary"}`}>{icon}</span>
      {label}
    </button>
  );
}
