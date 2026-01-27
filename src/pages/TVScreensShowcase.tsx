import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Users, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TVMockProvider, useTVMock, MOCK_PLAYERS, MOCK_QUESTIONS, MOCK_CATEGORY_QUEUE } from '@/contexts/TVMockContext';
import { TVGameContext } from '@/contexts/TVGameContext';

// Import TV screen components
import { TVPairingScreenV3 } from '@/components/tv/TVPairingScreenV3';
import { TVLobbyScreenV2 } from '@/components/tv/TVLobbyScreenV2';
import { TVRoundIntroScreen } from '@/components/tv/TVRoundIntroScreen';
import { TVCountdownScreenV2 } from '@/components/tv/TVCountdownScreenV2';
import { TVQuestionScreenV4 } from '@/components/tv/TVQuestionScreenV4';
import { TVResultsScreen } from '@/components/tv/TVResultsScreen';
import { TVPollScreen } from '@/components/tv/TVPollScreen';

const SCREENS = [
  { id: 'pairing', name: 'Pairing', phase: 'pairing' as const },
  { id: 'lobby', name: 'Lobby', phase: 'lobby' as const },
  { id: 'poll', name: 'Poll', phase: 'poll-suggest' as const },
  { id: 'round-intro', name: 'Round Intro', phase: 'round_intro' as const },
  { id: 'countdown', name: 'Countdown', phase: 'countdown' as const },
  { id: 'question', name: 'Question', phase: 'playing' as const },
  { id: 'question-reveal', name: 'Reveal', phase: 'reveal' as const },
  { id: 'results', name: 'Results', phase: 'results' as const },
];

// Create a mock TVGameContext value from TVMockContext
const createMockTVGameValue = (mockCtx: ReturnType<typeof useTVMock>) => ({
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
  error: null,
  isLoading: false,
  roomId: 'mock-room-id',
  roomName: mockCtx.roomName, // Pass room name for lobby header
  categoryQueue: mockCtx.categoryQueue, // Pass the actual queue
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

const TVGameContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockCtx = useTVMock();
  const mockValue = createMockTVGameValue(mockCtx);
  return (
    <TVGameContext.Provider value={mockValue as any}>
      {children}
    </TVGameContext.Provider>
  );
};

const ScreenRenderer: React.FC<{ screenId: string }> = ({ screenId }) => {
  switch (screenId) {
    case 'pairing':
      return <TVPairingScreenV3 />;
    case 'lobby':
      return <TVLobbyScreenV2 />;
    case 'poll':
      return <TVPollScreen />;
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

// Horizontal controls bar
const ControlsBar: React.FC<{ screenId: string }> = ({ screenId }) => {
  const mockCtx = useTVMock();

  return (
    <div className="flex items-center gap-6 px-6 py-3 bg-white/5 border-b border-white/10 overflow-x-auto">
      {/* Timer control */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <Timer className="w-4 h-4 text-white/60" />
        <span className="text-white text-sm font-medium w-8">{mockCtx.timeRemaining}s</span>
        <Slider
          value={[mockCtx.timeRemaining]}
          onValueChange={([val]) => mockCtx.setTimeRemaining(val)}
          min={0}
          max={15}
          step={1}
          className="w-24"
        />
      </div>

      {/* Reveal toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={mockCtx.isReveal}
          onCheckedChange={mockCtx.setIsReveal}
          id="reveal-toggle"
        />
        <Label htmlFor="reveal-toggle" className="text-white text-sm cursor-pointer">
          {mockCtx.isReveal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Label>
        <span className="text-white/60 text-xs">Reveal</span>
      </div>

      {/* Question navigation */}
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-xs">Q:</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => mockCtx.setCurrentQuestionIndex(Math.max(0, mockCtx.currentQuestionIndex - 1))}
          disabled={mockCtx.currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-white text-sm font-mono">{mockCtx.currentQuestionIndex + 1}/{MOCK_QUESTIONS.length}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => mockCtx.setCurrentQuestionIndex(Math.min(MOCK_QUESTIONS.length - 1, mockCtx.currentQuestionIndex + 1))}
          disabled={mockCtx.currentQuestionIndex >= MOCK_QUESTIONS.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Round navigation */}
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-xs">Round:</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => mockCtx.setRoundNumber(Math.max(1, mockCtx.roundNumber - 1))}
          disabled={mockCtx.roundNumber === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-white text-sm font-mono">{mockCtx.roundNumber}/{mockCtx.totalRounds}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/10"
          onClick={() => mockCtx.setRoundNumber(Math.min(mockCtx.totalRounds, mockCtx.roundNumber + 1))}
          disabled={mockCtx.roundNumber >= mockCtx.totalRounds}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Total rounds selector */}
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-xs">Categories:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(count => (
            <button
              key={count}
              onClick={() => {
                mockCtx.setTotalRounds(count);
                // Reset round number if it exceeds new total
                if (mockCtx.roundNumber > count) {
                  mockCtx.setRoundNumber(count);
                }
              }}
              className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                mockCtx.totalRounds === count
                  ? 'bg-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Player count */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-white/60" />
        <div className="flex gap-1">
          {[2, 3, 4, 5, 6].map(count => (
            <button
              key={count}
              onClick={() => mockCtx.setPlayers(MOCK_PLAYERS.slice(0, count))}
              className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                mockCtx.players.length === count
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mockCtx.setTimeRemaining(15)}
          className="text-white/60 hover:text-white hover:bg-white/10 text-xs h-7"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* State indicator */}
      <div className="flex items-center gap-2 pl-4 border-l border-white/10">
        <span className="text-white/40 text-xs">Phase:</span>
        <span className="text-primary font-mono text-xs">{mockCtx.phase}</span>
      </div>
    </div>
  );
};

const TVScreensShowcaseContent: React.FC = () => {
  const navigate = useNavigate();
  const [currentScreenIndex, setCurrentScreenIndex] = useState(4);
  const currentScreen = SCREENS[currentScreenIndex];
  const mockCtx = useTVMock();

  React.useEffect(() => {
    mockCtx.setPhase(currentScreen.phase);
    if (currentScreen.id === 'question-reveal') {
      mockCtx.setIsReveal(true);
    } else if (currentScreen.id === 'question') {
      mockCtx.setIsReveal(false);
    }
  }, [currentScreen]);

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header with screen tabs */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-white/10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white whitespace-nowrap">TV Showcase</h1>

        {/* Screen tabs */}
        <div className="flex items-center gap-1 ml-4 overflow-x-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreenIndex(i => Math.max(0, i - 1))}
            disabled={currentScreenIndex === 0}
            className="text-white hover:bg-white/10 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          {SCREENS.map((screen, index) => (
            <button
              key={screen.id}
              onClick={() => setCurrentScreenIndex(index)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                index === currentScreenIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {screen.name}
            </button>
          ))}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreenIndex(i => Math.min(SCREENS.length - 1, i + 1))}
            disabled={currentScreenIndex === SCREENS.length - 1}
            className="text-white hover:bg-white/10 shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Controls bar */}
      <ControlsBar screenId={currentScreen.id} />

      {/* TV Preview - fills remaining space */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="w-full h-full max-w-[1600px] max-h-[900px] relative">
          {/* TV frame with 16:9 aspect ratio that fills available space */}
          <div 
            className="absolute inset-0 bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10"
            style={{ aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%', margin: 'auto', top: 0, bottom: 0, left: 0, right: 0 }}
          >
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
        </div>
      </div>
    </div>
  );
};

export default function TVScreensShowcase() {
  return (
    <TVMockProvider>
      <TVScreensShowcaseContent />
    </TVMockProvider>
  );
}
