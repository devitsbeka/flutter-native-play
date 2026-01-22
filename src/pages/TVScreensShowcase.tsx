import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Users, Clock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TVMockProvider, useTVMock, MOCK_PLAYERS, MOCK_QUESTIONS } from '@/contexts/TVMockContext';
import { TVGameContext } from '@/contexts/TVGameContext';

// Import TV screen components
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVRoundIntroScreen } from '@/components/tv/TVRoundIntroScreen';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV4 } from '@/components/tv/TVQuestionScreenV4';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';

const SCREENS = [
  { id: 'pairing', name: 'Pairing Screen', phase: 'pairing' as const },
  { id: 'lobby', name: 'Lobby Screen', phase: 'lobby' as const },
  { id: 'round-intro', name: 'Round Intro', phase: 'round_intro' as const },
  { id: 'countdown', name: 'Countdown', phase: 'countdown' as const },
  { id: 'question', name: 'Question Screen', phase: 'playing' as const },
  { id: 'question-reveal', name: 'Question Reveal', phase: 'reveal' as const },
  { id: 'results', name: 'Results Screen', phase: 'results' as const },
];

// Create a mock TVGameContext value from TVMockContext
const createMockTVGameValue = (mockCtx: ReturnType<typeof useTVMock>) => ({
  // Core state
  phase: mockCtx.phase,
  code: mockCtx.code,
  sessionId: mockCtx.sessionId,
  players: mockCtx.players,
  questions: mockCtx.questions,
  currentQuestionIndex: mockCtx.currentQuestionIndex,
  timeRemaining: mockCtx.timeRemaining,
  categoryName: mockCtx.categoryName,
  categoryIcon: mockCtx.categoryIcon,
  roundNumber: mockCtx.roundNumber,
  totalRounds: mockCtx.totalRounds,
  isPaired: mockCtx.isPaired,
  isHost: mockCtx.isHost,
  
  // Additional required fields
  error: null,
  isLoading: false,
  roomId: 'mock-room-id',
  categoryQueue: [],
  questionsPerRound: 5,
  currentQuestion: mockCtx.questions[mockCtx.currentQuestionIndex] || null,
  timerMax: 15,
  timerPercent: (mockCtx.timeRemaining / 15) * 100,
  isReveal: mockCtx.isReveal,
  correctAnswer: mockCtx.questions[mockCtx.currentQuestionIndex]?.correct_answer || '',
  totalQuestions: mockCtx.questions.length,
  roundWinner: null,
  roundResults: [],
  finalResults: [],
  answeredCount: mockCtx.players.filter(p => p.hasAnswered).length,
  totalPlayers: mockCtx.players.length,
  
  // No-op functions
  initSession: async () => {},
  joinSession: async () => true,
  startGame: async () => {},
  submitAnswer: async () => {},
  startPlaying: () => {},
  nextQuestion: () => {},
  showResults: () => {},
  startNextRound: () => {},
  resetGame: () => {},
  leaveSession: () => {},
  kickPlayer: async () => {},
  setPhase: mockCtx.setPhase,
});

// Wrapper that bridges TVMockContext to TVGameContext
const TVGameContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockCtx = useTVMock();
  const mockValue = createMockTVGameValue(mockCtx);
  
  return (
    <TVGameContext.Provider value={mockValue as any}>
      {children}
    </TVGameContext.Provider>
  );
};

// Screen renderer
const ScreenRenderer: React.FC<{ screenId: string }> = ({ screenId }) => {
  switch (screenId) {
    case 'pairing':
      return <TVPairingScreenV3 />;
    case 'lobby':
      return <TVLobbyScreenV2 />;
    case 'round-intro':
      return <TVRoundIntroScreen />;
    case 'countdown':
      return <TVCountdownScreenV2 />;
    case 'question':
    case 'question-reveal':
      return <TVQuestionScreenV4 />;
    case 'results':
      return <TVResultsScreen />;
    default:
      return <div className="flex items-center justify-center h-full text-white">Unknown screen</div>;
  }
};

// Controls panel for each screen
const ScreenControls: React.FC<{ screenId: string }> = ({ screenId }) => {
  const mockCtx = useTVMock();

  if (screenId === 'question' || screenId === 'question-reveal') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="text-white min-w-[100px]">Timer: {mockCtx.timeRemaining}s</Label>
          <Slider
            value={[mockCtx.timeRemaining]}
            onValueChange={([val]) => mockCtx.setTimeRemaining(val)}
            min={0}
            max={15}
            step={1}
            className="flex-1"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <Label className="text-white min-w-[100px]">Reveal Mode</Label>
          <Switch
            checked={mockCtx.isReveal}
            onCheckedChange={mockCtx.setIsReveal}
          />
          <span className="text-white/60 text-sm">
            {mockCtx.isReveal ? 'Showing correct answer' : 'Waiting for answers'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Label className="text-white min-w-[100px]">Question</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mockCtx.setCurrentQuestionIndex(Math.max(0, mockCtx.currentQuestionIndex - 1))}
            disabled={mockCtx.currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white">{mockCtx.currentQuestionIndex + 1} / {MOCK_QUESTIONS.length}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mockCtx.setCurrentQuestionIndex(Math.min(MOCK_QUESTIONS.length - 1, mockCtx.currentQuestionIndex + 1))}
            disabled={mockCtx.currentQuestionIndex >= MOCK_QUESTIONS.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (screenId === 'round-intro' || screenId === 'lobby') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="text-white min-w-[100px]">Round</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mockCtx.setRoundNumber(Math.max(1, mockCtx.roundNumber - 1))}
            disabled={mockCtx.roundNumber === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white">{mockCtx.roundNumber} / {mockCtx.totalRounds}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mockCtx.setRoundNumber(Math.min(mockCtx.totalRounds, mockCtx.roundNumber + 1))}
            disabled={mockCtx.roundNumber >= mockCtx.totalRounds}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Label className="text-white min-w-[100px]">Players</Label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(count => (
              <Button
                key={count}
                variant={mockCtx.players.length === count ? 'default' : 'outline'}
                size="sm"
                onClick={() => mockCtx.setPlayers(MOCK_PLAYERS.slice(0, count))}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white/60 text-sm">
      No controls available for this screen
    </div>
  );
};

// Main showcase component
const TVScreensShowcaseContent: React.FC = () => {
  const navigate = useNavigate();
  const [currentScreenIndex, setCurrentScreenIndex] = useState(4); // Start on question screen
  const currentScreen = SCREENS[currentScreenIndex];
  const mockCtx = useTVMock();

  // Update phase when screen changes
  React.useEffect(() => {
    mockCtx.setPhase(currentScreen.phase);
    // Reset reveal when switching screens
    if (currentScreen.id === 'question-reveal') {
      mockCtx.setIsReveal(true);
    } else if (currentScreen.id === 'question') {
      mockCtx.setIsReveal(false);
    }
  }, [currentScreen]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">TV Screens Showcase</h1>
        </div>

        {/* Screen selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreenIndex(i => Math.max(0, i - 1))}
            disabled={currentScreenIndex === 0}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex gap-1">
            {SCREENS.map((screen, index) => (
              <button
                key={screen.id}
                onClick={() => setCurrentScreenIndex(index)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  index === currentScreenIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {screen.name}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreenIndex(i => Math.min(SCREENS.length - 1, i + 1))}
            disabled={currentScreenIndex === SCREENS.length - 1}
            className="text-white hover:bg-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
        {/* TV Preview - 16:9 aspect ratio */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
              <TVGameContextBridge>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentScreen.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <ScreenRenderer screenId={currentScreen.id} />
                  </motion.div>
                </AnimatePresence>
              </TVGameContextBridge>
            </div>
            
            {/* Screen info */}
            <div className="mt-4 text-center">
              <p className="text-white/40 text-sm">
                Phase: <span className="text-white font-mono">{currentScreen.phase}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Controls panel */}
        <div className="lg:w-80 bg-white/5 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>⚙️</span> Controls
          </h2>
          
          <ScreenControls screenId={currentScreen.id} />

          {/* Quick actions */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => mockCtx.setTimeRemaining(15)}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset Timer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mockCtx.setIsReveal(!mockCtx.isReveal)}
                className="text-xs"
              >
                {mockCtx.isReveal ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                Toggle Reveal
              </Button>
            </div>
          </div>

          {/* Current state debug */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-3">Current State</h3>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-white/80 space-y-1">
              <div>phase: {mockCtx.phase}</div>
              <div>players: {mockCtx.players.length}</div>
              <div>question: {mockCtx.currentQuestionIndex + 1}/{MOCK_QUESTIONS.length}</div>
              <div>timer: {mockCtx.timeRemaining}s</div>
              <div>reveal: {mockCtx.isReveal ? 'true' : 'false'}</div>
              <div>round: {mockCtx.roundNumber}/{mockCtx.totalRounds}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export wrapped component
export default function TVScreensShowcase() {
  return (
    <TVMockProvider>
      <TVScreensShowcaseContent />
    </TVMockProvider>
  );
}
