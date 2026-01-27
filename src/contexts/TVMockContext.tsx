import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

// Mock player data
export const MOCK_PLAYERS = [
  { id: '1', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-1', session_id: 'mock-session', nickname: 'თამარი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', score: 450, isHost: true, hasAnswered: true, lastAnswerCorrect: true, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '2', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-2', session_id: 'mock-session', nickname: 'გიორგი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', score: 320, isHost: false, hasAnswered: true, lastAnswerCorrect: false, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '3', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-3', session_id: 'mock-session', nickname: 'ნინო', avatar_url: null, score: 280, isHost: false, hasAnswered: false, lastAnswerCorrect: null, isReadyForNextRound: false, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '4', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-4', session_id: 'mock-session', nickname: 'დავითი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', score: 180, isHost: false, hasAnswered: true, lastAnswerCorrect: true, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '5', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-5', session_id: 'mock-session', nickname: 'ანა', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', score: 120, isHost: false, hasAnswered: true, lastAnswerCorrect: false, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '6', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-6', session_id: 'mock-session', nickname: 'ლუკა', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6', score: 90, isHost: false, hasAnswered: false, lastAnswerCorrect: null, isReadyForNextRound: false, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
];

export const MOCK_QUESTIONS = [
  {
    id: 'q1',
    question_text: 'რომელი პლანეტა არის მზის სისტემის ყველაზე დიდი?',
    options: ['მარსი', 'იუპიტერი', 'სატურნი', 'ნეპტუნი'],
    correct_answer: 'იუპიტერი',
    icon_slug: 'planet',
  },
  {
    id: 'q2',
    question_text: 'რამდენი კონტინენტი არსებობს დედამიწაზე?',
    options: ['5', '6', '7', '8'],
    correct_answer: '7',
    icon_slug: 'globe',
  },
];

// Mock category queue items for lobby
export const MOCK_CATEGORY_QUEUE = [
  { id: 'cat-1', position: 0, category_id: 'astronomy', category_name: 'ასტრონომია', icon_slug: 'telescope', source_type: 'category' },
  { id: 'cat-2', position: 1, category_id: 'geography', category_name: 'გეოგრაფია', icon_slug: 'globe', source_type: 'category' },
  { id: 'cat-3', position: 2, category_id: 'history', category_name: 'ისტორია', icon_slug: 'scroll', source_type: 'category' },
  { id: 'cat-4', position: 3, category_id: 'science', category_name: 'მეცნიერება', icon_slug: 'flask', source_type: 'category' },
  { id: 'cat-5', position: 4, category_id: 'sports', category_name: 'სპორტი', icon_slug: 'trophy', source_type: 'category' },
];

export type TVPhase = 'pairing' | 'lobby' | 'round_intro' | 'countdown' | 'playing' | 'reveal' | 'results' | 'final_results' | 'poll-suggest' | 'poll-voting' | 'poll-results';

export interface MockCategoryQueueItem {
  id: string;
  position: number;
  category_id: string;
  category_name: string;
  icon_slug: string;
  source_type: string;
}

interface TVMockContextType {
  phase: TVPhase;
  setPhase: (phase: TVPhase) => void;
  code: string;
  sessionId: string;
  players: typeof MOCK_PLAYERS;
  setPlayers: React.Dispatch<React.SetStateAction<typeof MOCK_PLAYERS>>;
  questions: typeof MOCK_QUESTIONS;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
  timeRemaining: number;
  setTimeRemaining: (time: number) => void;
  categoryName: string;
  categoryIcon: string;
  roundNumber: number;
  setRoundNumber: (round: number) => void;
  totalRounds: number;
  setTotalRounds: (rounds: number) => void;
  categoryQueue: MockCategoryQueueItem[];
  isPaired: boolean;
  isHost: boolean;
  isReveal: boolean;
  setIsReveal: (reveal: boolean) => void;
  roomName: string;
}

const TVMockContext = createContext<TVMockContextType | null>(null);

interface TVMockProviderProps {
  children: ReactNode;
  initialPhase?: TVPhase;
  initialTimeRemaining?: number;
  initialIsReveal?: boolean;
}

export const TVMockProvider: React.FC<TVMockProviderProps> = ({
  children,
  initialPhase = 'playing',
  initialTimeRemaining = 12,
  initialIsReveal = false,
}) => {
  const [phase, setPhase] = useState<TVPhase>(initialPhase);
  const [players, setPlayers] = useState(MOCK_PLAYERS.slice(0, 5));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [isReveal, setIsReveal] = useState(initialIsReveal);

  // Category queue based on total rounds
  const categoryQueue = useMemo(() => {
    return MOCK_CATEGORY_QUEUE.slice(0, totalRounds);
  }, [totalRounds]);

  // Current category based on round number
  const currentCategory = categoryQueue[roundNumber - 1] || categoryQueue[0];

  const value: TVMockContextType = {
    phase,
    setPhase,
    code: '1234',
    sessionId: 'mock-session-id',
    players,
    setPlayers,
    questions: MOCK_QUESTIONS,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timeRemaining,
    setTimeRemaining,
    categoryName: currentCategory?.category_name || 'ასტრონომია',
    categoryIcon: '🔭',
    roundNumber,
    setRoundNumber,
    totalRounds,
    setTotalRounds,
    categoryQueue,
    isPaired: true,
    isHost: true,
    isReveal,
    setIsReveal,
    roomName: 'სახალისო კვიზი',
  };

  return (
    <TVMockContext.Provider value={value}>
      {children}
    </TVMockContext.Provider>
  );
};

export const useTVMock = () => {
  const context = useContext(TVMockContext);
  if (!context) {
    throw new Error('useTVMock must be used within a TVMockProvider');
  }
  return context;
};
