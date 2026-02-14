import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import men1Video from '@/assets/m1.mp4';
import men2Video from '@/assets/m2.mp4';
import woman1Video from '@/assets/demo/woman-1.mp4';
import woman2Video from '@/assets/demo/woman-2.mp4';

// === HARDCODED DATA ===

export const DEMO_PLAYERS = [
  { id: 'p1', nickname: 'ირაკლი', avatar_url: null as string | null, avatar_video: men1Video, score: 0, isHost: true, hasAnswered: false, lastAnswerCorrect: null as boolean | null, currentAnswer: null as string | null, answerTime: null as number | null },
  { id: 'p2', nickname: 'გიო', avatar_url: null as string | null, avatar_video: men2Video, score: 0, isHost: false, hasAnswered: false, lastAnswerCorrect: null as boolean | null, currentAnswer: null as string | null, answerTime: null as number | null },
  { id: 'p3', nickname: 'თამუნა', avatar_url: null as string | null, avatar_video: woman1Video, score: 0, isHost: false, hasAnswered: false, lastAnswerCorrect: null as boolean | null, currentAnswer: null as string | null, answerTime: null as number | null },
  { id: 'p4', nickname: 'მაკა', avatar_url: null as string | null, avatar_video: woman2Video, score: 0, isHost: false, hasAnswered: false, lastAnswerCorrect: null as boolean | null, currentAnswer: null as string | null, answerTime: null as number | null },
];

export const DEMO_QUESTIONS = [
  {
    id: 'dq1',
    question_text: 'ვინ დაწერა „ვეფხისტყაოსანი"?',
    options: ['ილია ჭავჭავაძე', 'შოთა რუსთაველი', 'აკაკი წერეთელი', 'ნიკოლოზ ბარათაშვილი'],
    correct_answer: 'შოთა რუსთაველი',
    icon_slug: 'book',
  },
  {
    id: 'dq2',
    question_text: 'რომელ ქალაქში დაიბადა ნიკოლოზ ბარათაშვილი?',
    options: ['ქუთაისი', 'თბილისი', 'ბათუმი', 'გორი'],
    correct_answer: 'თბილისი',
    icon_slug: 'map-pin',
  },
  {
    id: 'dq3',
    question_text: 'რომელ ეპოქაში მოღვაწეობდა სულხან-საბა ორბელიანი?',
    options: ['XV-XVI საუკუნე', 'XVII-XVIII საუკუნე', 'XIX საუკუნე', 'XIV საუკუნე'],
    correct_answer: 'XVII-XVIII საუკუნე',
    icon_slug: 'scroll',
  },
  {
    id: 'dq4',
    question_text: 'როდის დაიბადა მიხეილ ჯავახიშვილი?',
    options: ['1860 წელი', '1880 წელი', '1900 წელი', '1870 წელი'],
    correct_answer: '1880 წელი',
    icon_slug: 'calendar',
  },
  {
    id: 'dq5',
    question_text: 'ვის უწოდეს „ფშაველ-ხევსურთა ბრძენკაცი"?',
    options: ['ილია ჭავჭავაძე', 'აკაკი წერეთელი', 'ვაჟა-ფშაველა', 'გალაკტიონ ტაბიძე'],
    correct_answer: 'ვაჟა-ფშაველა',
    icon_slug: 'mountain',
  },
];

// Predetermined AI answer patterns: [questionIndex][playerId] = { correct: boolean, answerDelay: seconds }
const AI_ANSWER_PATTERNS: Record<string, { correct: boolean; delay: number }[]> = {
  // ირაკლი: 3/5 correct
  p1: [
    { correct: true, delay: 4 }, { correct: true, delay: 6 }, { correct: false, delay: 8 },
    { correct: true, delay: 5 }, { correct: false, delay: 7 },
  ],
  // გიო: 2/5 correct
  p2: [
    { correct: false, delay: 9 }, { correct: true, delay: 7 }, { correct: false, delay: 5 },
    { correct: false, delay: 10 }, { correct: true, delay: 6 },
  ],
  // მაკა: 4/5 correct (winner)
  p4: [
    { correct: true, delay: 3 }, { correct: true, delay: 4 }, { correct: true, delay: 3 },
    { correct: true, delay: 2 }, { correct: false, delay: 8 },
  ],
};

export type DemoPhase = 'idle' | 'countdown' | 'playing' | 'reveal' | 'results';

interface DemoGameContextType {
  phase: DemoPhase;
  countdownValue: number;
  currentQuestionIndex: number;
  timeRemaining: number;
  players: typeof DEMO_PLAYERS;
  questions: typeof DEMO_QUESTIONS;
  playerAnswer: string | null;
  playerAnswerCorrect: boolean | null;
  startGame: () => void;
  submitAnswer: (answer: string) => void;
  isDriver: boolean;
}

const DemoGameContext = createContext<DemoGameContextType | null>(null);

export const DemoGameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [players, setPlayers] = useState(DEMO_PLAYERS.map(p => ({ ...p, score: 0, hasAnswered: false, lastAnswerCorrect: null, currentAnswer: null, answerTime: null })));
  const [playerAnswer, setPlayerAnswer] = useState<string | null>(null);
  const [playerAnswerCorrect, setPlayerAnswerCorrect] = useState<boolean | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  const bcRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Initialize BroadcastChannel
  useEffect(() => {
    const bc = new BroadcastChannel('demo-game-sync');
    bcRef.current = bc;

    bc.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'start' && phase === 'idle') {
        setIsDriver(false);
        beginCountdown();
      } else if (msg.type === 'state') {
        // Follower syncs from driver
        setPhase(msg.phase);
        setCountdownValue(msg.countdownValue);
        setCurrentQuestionIndex(msg.questionIndex);
        setTimeRemaining(msg.timeRemaining);
        setPlayers(msg.players);
      }
    };

    return () => {
      bc.close();
      if (timerRef.current) clearInterval(timerRef.current);
      aiTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const broadcast = useCallback((data: any) => {
    bcRef.current?.postMessage(data);
  }, []);

  const beginCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdownValue(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setCountdownValue(0);
        // Start first question after brief "GO!" display
        setTimeout(() => {
          startQuestion(0);
        }, 800);
      } else {
        setCountdownValue(count);
      }
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateScore = (timeLeft: number): number => {
    return 100 + Math.round((timeLeft / 15) * 150); // base 100 + up to 150 time bonus
  };

  const startQuestion = useCallback((qIndex: number) => {
    setPhase('playing');
    setCurrentQuestionIndex(qIndex);
    setTimeRemaining(15);
    setPlayerAnswer(null);
    setPlayerAnswerCorrect(null);

    // Reset player answer states
    setPlayers(prev => prev.map(p => ({
      ...p,
      hasAnswered: false,
      lastAnswerCorrect: null,
      currentAnswer: null,
      answerTime: null,
    })));

    // Clear old AI timers
    aiTimersRef.current.forEach(t => clearTimeout(t));
    aiTimersRef.current = [];

    // Schedule AI answers
    ['p1', 'p2', 'p4'].forEach(pid => {
      const pattern = AI_ANSWER_PATTERNS[pid]?.[qIndex];
      if (!pattern) return;
      const timer = setTimeout(() => {
        setPlayers(prev => prev.map(p => {
          if (p.id !== pid) return p;
          const timeLeft = 15 - pattern.delay;
          const question = DEMO_QUESTIONS[qIndex];
          const answer = pattern.correct
            ? question.correct_answer
            : question.options.find(o => o !== question.correct_answer)!;
          return {
            ...p,
            hasAnswered: true,
            lastAnswerCorrect: pattern.correct,
            currentAnswer: answer,
            answerTime: timeLeft,
            score: pattern.correct ? p.score + calculateScore(timeLeft) : p.score,
          };
        }));
      }, pattern.delay * 1000);
      aiTimersRef.current.push(timer);
    });

    // Start countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = 15;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        // Enter reveal phase
        setPhase('reveal');
        // Auto-advance after 3 seconds
        setTimeout(() => {
          const nextQ = qIndex + 1;
          if (nextQ < DEMO_QUESTIONS.length) {
            startQuestion(nextQ);
          } else {
            setPhase('results');
          }
        }, 3000);
      }
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Driver broadcasts state changes
  useEffect(() => {
    if (isDriver && phase !== 'idle') {
      broadcast({
        type: 'state',
        phase,
        countdownValue,
        questionIndex: currentQuestionIndex,
        timeRemaining,
        players,
      });
    }
  }, [phase, countdownValue, currentQuestionIndex, timeRemaining, players, isDriver, broadcast]);

  const startGame = useCallback(() => {
    setIsDriver(true);
    broadcast({ type: 'start' });
    beginCountdown();
  }, [broadcast, beginCountdown]);

  const submitAnswer = useCallback((answer: string) => {
    if (playerAnswer !== null || phase !== 'playing') return;
    const question = DEMO_QUESTIONS[currentQuestionIndex];
    const correct = answer === question.correct_answer;
    setPlayerAnswer(answer);
    setPlayerAnswerCorrect(correct);

    // Update თამუნა (p3) in players
    setPlayers(prev => prev.map(p => {
      if (p.id !== 'p3') return p;
      return {
        ...p,
        hasAnswered: true,
        lastAnswerCorrect: correct,
        currentAnswer: answer,
        answerTime: timeRemaining,
        score: correct ? p.score + calculateScore(timeRemaining) : p.score,
      };
    }));
  }, [playerAnswer, phase, currentQuestionIndex, timeRemaining]);

  return (
    <DemoGameContext.Provider value={{
      phase,
      countdownValue,
      currentQuestionIndex,
      timeRemaining,
      players,
      questions: DEMO_QUESTIONS,
      playerAnswer,
      playerAnswerCorrect,
      startGame,
      submitAnswer,
      isDriver,
    }}>
      {children}
    </DemoGameContext.Provider>
  );
};

export const useDemoGame = () => {
  const ctx = useContext(DemoGameContext);
  if (!ctx) throw new Error('useDemoGame must be used within DemoGameProvider');
  return ctx;
};
