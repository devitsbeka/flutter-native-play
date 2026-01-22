import React, { createContext, useContext, useState, ReactNode } from 'react';

// Mock player data
export const MOCK_PLAYERS = [
  { id: '1', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-1', session_id: 'mock-session', nickname: 'თამარი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', score: 450, isHost: true, hasAnswered: true, lastAnswerCorrect: true, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '2', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-2', session_id: 'mock-session', nickname: 'გიორგი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', score: 320, isHost: false, hasAnswered: true, lastAnswerCorrect: false, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '3', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-3', session_id: 'mock-session', nickname: 'ნინო', avatar_url: null, score: 280, isHost: false, hasAnswered: false, lastAnswerCorrect: null, isReadyForNextRound: false, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
  { id: '4', oddsMultiplier: 1, oddsLocked: false, oddsExpireAt: null, oddsLockCount: 0, oddsLastUpdated: null, oddsChangedThisRound: false, oddsResetUsed: false, oddsHistory: [], oddsBaseMultiplier: 1, user_id: 'user-4', session_id: 'mock-session', nickname: 'დავითი', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', score: 180, isHost: false, hasAnswered: true, lastAnswerCorrect: true, isReadyForNextRound: true, currentAnswer: null, answerTime: null, joinedAt: new Date().toISOString() },
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

export type TVPhase = 'pairing' | 'lobby' | 'round_intro' | 'countdown' | 'playing' | 'reveal' | 'results' | 'final_results';

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
  isPaired: boolean;
  isHost: boolean;
  isReveal: boolean;
  setIsReveal: (reveal: boolean) => void;
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
  const [players, setPlayers] = useState(MOCK_PLAYERS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isReveal, setIsReveal] = useState(initialIsReveal);

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
    categoryName: 'ასტრონომია',
    categoryIcon: '🌟',
    roundNumber,
    setRoundNumber,
    totalRounds: 3,
    isPaired: true,
    isHost: true,
    isReveal,
    setIsReveal,
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
