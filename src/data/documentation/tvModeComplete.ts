/**
 * TV Mode Complete Documentation Data
 * 
 * This file contains all documentation data for the TV Mode game system,
 * organized for rendering in the TVModeGameDocs page.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DocItem {
  name: string;
  path: string;
  lines?: number;
  description: string;
  exports?: string[];
  dependencies?: string[];
  keyFunctions?: string[];
  relatedItems?: string[];
  codeExample?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  description: string;
}

export interface DatabaseTable {
  name: string;
  columns: TableColumn[];
  description: string;
  relatedTables?: string[];
}

export interface RLSPolicy {
  table: string;
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  sql: string;
  description: string;
}

export interface DataFlow {
  name: string;
  description: string;
  mermaidDiagram: string;
}

// ============================================================================
// PAGES (5)
// ============================================================================

export const TV_PAGES: DocItem[] = [
  {
    name: 'TVDisplay',
    path: 'src/pages/TVDisplay.tsx',
    lines: 177,
    description: 'Main TV display page shown on the television. Renders different screens based on game phase (pairing, lobby, countdown, question, reveal, results). Handles session creation when accessed without a code.',
    exports: ['TVDisplay (default)'],
    keyFunctions: ['initSession', 'handleStartGame'],
    dependencies: ['TVGameProvider', 'TVPairingScreenV3', 'TVLobbyScreenV2', 'TVCountdownScreenV2', 'TVQuestionScreenV4', 'TVResultsScreen', 'TVRoundIntroScreen', 'TVPollScreen'],
    relatedItems: ['TVGameContext', 'TVErrorBoundary'],
  },
  {
    name: 'TVLobby',
    path: 'src/pages/TVLobby.tsx',
    lines: 114,
    description: 'Creates a new TV session and displays the pairing screen. Auto-refreshes pairing code every 5 minutes if no players join. Acts as the entry point for new TV game sessions.',
    exports: ['TVLobby (default)'],
    keyFunctions: ['initSession', 'checkAndRefresh'],
    dependencies: ['TVGameProvider', 'TVPairingScreenV3', 'TVLobbyScreenV2', 'TVCountdownScreenV2', 'TVQuestionScreenV4', 'TVResultsScreenV2'],
    relatedItems: ['TVGameContext'],
  },
  {
    name: 'TVHostController',
    path: 'src/pages/TVHostController.tsx',
    lines: 1167,
    description: 'Host\'s mobile controller interface for managing TV game sessions. Provides category selection, queue management with drag-and-drop reordering, poll initiation, and game start controls. Displays current game state and player list.',
    exports: ['TVHostController (default)'],
    keyFunctions: ['handleStartGame', 'handleCategorySelect', 'handleDeleteQueueItem', 'handleReorder', 'handleEndVoting', 'handleFinalizeAndStart'],
    dependencies: ['useTVGame', 'useTVSessionQueue', 'useTVPoll', 'CategoryPickerModal', 'ControllerPollScreen', 'ControllerPollResults', 'ControllerDirectSelection'],
    relatedItems: ['TVGameContext', 'useTVSessionQueue', 'useTVPoll'],
  },
  {
    name: 'TVJoin',
    path: 'src/pages/TVJoin.tsx',
    lines: 138,
    description: 'Player join flow page. Handles code entry via manual input or QR scan, then shows appropriate controller screen based on game phase. Supports both 4-digit TV codes and session IDs.',
    exports: ['TVJoin (default)'],
    keyFunctions: ['onJoined'],
    dependencies: ['TVGameProvider', 'ControllerCodeEntry', 'ControllerLobby', 'ControllerCountdown', 'ControllerQuestion', 'ControllerReveal', 'ControllerResults', 'ControllerPollScreen'],
    relatedItems: ['TVGameContext', 'useTVPoll'],
  },
  {
    name: 'TVScreensShowcase',
    path: 'src/pages/TVScreensShowcase.tsx',
    lines: 450,
    description: 'Development testing page for previewing all TV game phases in a 16:9 aspect ratio container. Uses TVMockContext to provide toggleable game states, player counts, and multi-round category queues without database access.',
    exports: ['TVScreensShowcase (default)'],
    keyFunctions: ['MockControlsBar'],
    dependencies: ['TVMockContext', 'All TV screen components'],
    relatedItems: ['TVMockContext'],
  },
];

// ============================================================================
// TV COMPONENTS (25)
// ============================================================================

export const TV_COMPONENTS: DocItem[] = [
  // Screens
  {
    name: 'TVPairingScreenV3',
    path: 'src/components/tv/TVPairingScreenV3.tsx',
    description: 'Displays large QR code and pairing code for players to join. Shows animated branding and instructions.',
    exports: ['TVPairingScreenV3'],
    dependencies: ['QRCodeDisplay', 'TVBrandingOverlay'],
  },
  {
    name: 'TVLobbyScreenV2',
    path: 'src/components/tv/TVLobbyScreenV2.tsx',
    description: 'Shows connected players in a grid layout with avatars and nicknames. Displays room icon, player count, and retro TV icon in header.',
    exports: ['TVLobbyScreenV2'],
    dependencies: ['Avatar', 'useTVGame'],
  },
  {
    name: 'TVCountdownScreenV2',
    path: 'src/components/tv/TVCountdownScreenV2.tsx',
    description: 'Animated countdown screen (3-2-1) before game starts with category icon display.',
    exports: ['TVCountdownScreenV2'],
    dependencies: ['framer-motion', 'useTVGame'],
  },
  {
    name: 'TVQuestionScreenV4',
    path: 'src/components/tv/TVQuestionScreenV4.tsx',
    description: 'Main question display showing question text, 4 answer options (A/B/C/D), countdown timer, and player avatar positions (left=wrong, center=waiting, right=correct).',
    exports: ['TVQuestionScreenV4'],
    dependencies: ['useTVGame', 'QuizCategoryIcon', 'Avatar', 'TVDebugOverlay'],
  },
  {
    name: 'TVRevealScreen',
    path: 'src/components/tv/TVRevealScreen.tsx',
    description: 'Shows correct answer with visual highlight. Deprecated in favor of inline reveal in TVQuestionScreenV4.',
    exports: ['TVRevealScreen'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'TVRevealScreenV2',
    path: 'src/components/tv/TVRevealScreenV2.tsx',
    description: 'Updated reveal screen with enhanced animations.',
    exports: ['TVRevealScreenV2'],
    dependencies: ['useTVGame', 'framer-motion'],
  },
  {
    name: 'TVResultsScreenV2',
    path: 'src/components/tv/TVResultsScreenV2.tsx',
    description: 'End-of-round leaderboard showing player rankings with scores. Displays accumulated scores for multi-round games.',
    exports: ['TVResultsScreenV2'],
    dependencies: ['useTVGame', 'TVLeaderboardPanel'],
  },
  {
    name: 'TVResultsScreen',
    path: 'src/components/tv/TVResultsScreen.tsx',
    description: 'Alternative results screen with different styling.',
    exports: ['TVResultsScreen'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'TVPollScreen',
    path: 'src/components/tv/TVPollScreen.tsx',
    description: 'Category voting screen for poll phases. Shows Georgian headers: "რა ვითამაშოთ?" (suggest) and "ხმა მიეცით!" (voting). Displays suggestion list with vote counts.',
    exports: ['TVPollScreen'],
    dependencies: ['useTVGame', 'useTVPoll', 'QuizCategoryIcon'],
  },
  {
    name: 'TVRoundIntroScreen',
    path: 'src/components/tv/TVRoundIntroScreen.tsx',
    description: 'Displays category intro between rounds showing category icon, name, and round number. Host-controlled transitions.',
    exports: ['TVRoundIntroScreen'],
    dependencies: ['useTVGame', 'QuizCategoryIcon', 'framer-motion'],
  },
  {
    name: 'TVIdleScreen',
    path: 'src/components/tv/TVIdleScreen.tsx',
    description: 'Screensaver-style idle screen shown when no game is active.',
    exports: ['TVIdleScreen'],
    dependencies: [],
  },
  {
    name: 'TVGameOverScreen',
    path: 'src/components/tv/TVGameOverScreen.tsx',
    description: 'Final game over screen with winner announcement and confetti celebration.',
    exports: ['TVGameOverScreen'],
    dependencies: ['canvas-confetti', 'useTVGame'],
  },
  // UI Elements
  {
    name: 'TVBrandingOverlay',
    path: 'src/components/tv/TVBrandingOverlay.tsx',
    description: 'Persistent branding overlay with logo and app name.',
    exports: ['TVBrandingOverlay'],
    dependencies: [],
  },
  {
    name: 'TVDebugOverlay',
    path: 'src/components/tv/TVDebugOverlay.tsx',
    description: 'Development-only debug overlay that polls database every 500ms. Displays active_player_count from session vs actual player_answers count for transparency into auto-advance logic.',
    exports: ['TVDebugOverlay'],
    dependencies: ['supabase', 'useTVGame'],
  },
  {
    name: 'TVLeaderboardPanel',
    path: 'src/components/tv/TVLeaderboardPanel.tsx',
    description: 'Reusable leaderboard component showing ranked player list with scores.',
    exports: ['TVLeaderboardPanel'],
    dependencies: ['Avatar'],
  },
  {
    name: 'TVScoreboardPanel',
    path: 'src/components/tv/TVScoreboardPanel.tsx',
    description: 'Compact scoreboard showing current standings during gameplay.',
    exports: ['TVScoreboardPanel'],
    dependencies: ['Avatar'],
  },
  {
    name: 'TVRoundQueueIndicator',
    path: 'src/components/tv/TVRoundQueueIndicator.tsx',
    description: 'Visual indicator showing upcoming rounds in the queue.',
    exports: ['TVRoundQueueIndicator'],
    dependencies: ['QuizCategoryIcon'],
  },
  {
    name: 'QRCodeDisplay',
    path: 'src/components/tv/QRCodeDisplay.tsx',
    description: 'Renders QR code for session join URL with customizable size and styling.',
    exports: ['QRCodeDisplay'],
    dependencies: ['qrcode.react'],
  },
  // Utilities
  {
    name: 'TVErrorBoundary',
    path: 'src/components/tv/TVErrorBoundary.tsx',
    description: 'Error boundary wrapper for TV display with retry functionality and custom error messages.',
    exports: ['TVErrorBoundary'],
    dependencies: ['react-error-boundary'],
  },
  {
    name: 'PlayOnTVButton',
    path: 'src/components/tv/PlayOnTVButton.tsx',
    description: 'Button component to initiate TV mode from other parts of the app.',
    exports: ['PlayOnTVButton'],
    dependencies: ['ChunkyButton'],
  },
  {
    name: 'TVMirrorModal',
    path: 'src/components/tv/TVMirrorModal.tsx',
    description: 'Modal for mirroring phone screen to TV via QR code scanning.',
    exports: ['TVMirrorModal'],
    dependencies: ['Dialog', 'QRCodeDisplay'],
  },
  {
    name: 'TVPairingScreen',
    path: 'src/components/tv/TVPairingScreen.tsx',
    description: 'Legacy pairing screen (V1). Use TVPairingScreenV3 for latest.',
    exports: ['TVPairingScreen'],
    dependencies: [],
  },
  {
    name: 'TVQuestionScreen',
    path: 'src/components/tv/TVQuestionScreen.tsx',
    description: 'Legacy question screen (V1). Use TVQuestionScreenV4 for latest.',
    exports: ['TVQuestionScreen'],
    dependencies: [],
  },
  {
    name: 'TVQuestionScreenV3',
    path: 'src/components/tv/TVQuestionScreenV3.tsx',
    description: 'Question screen V3. Use TVQuestionScreenV4 for latest.',
    exports: ['TVQuestionScreenV3'],
    dependencies: [],
  },
  {
    name: 'TVScoreboardScreen',
    path: 'src/components/tv/TVScoreboardScreen.tsx',
    description: 'Full-screen scoreboard display.',
    exports: ['TVScoreboardScreen'],
    dependencies: [],
  },
];

// ============================================================================
// CONTROLLER COMPONENTS (12)
// ============================================================================

export const CONTROLLER_COMPONENTS: DocItem[] = [
  {
    name: 'ControllerCodeEntry',
    path: 'src/components/controller/ControllerCodeEntry.tsx',
    description: 'Code entry screen for players joining via manual 4-digit code input. Includes OTP-style input and optional nickname entry.',
    exports: ['ControllerCodeEntry'],
    keyFunctions: ['handleJoin', 'handleCodeChange'],
    dependencies: ['useTVGame', 'GuestJoinModal'],
  },
  {
    name: 'ControllerLobby',
    path: 'src/components/controller/ControllerLobby.tsx',
    description: 'Player lobby screen showing connected players and waiting for game start.',
    exports: ['ControllerLobby'],
    dependencies: ['useTVGame', 'Avatar'],
  },
  {
    name: 'ControllerCountdown',
    path: 'src/components/controller/ControllerCountdown.tsx',
    description: 'Countdown display on player\'s controller device.',
    exports: ['ControllerCountdown'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'ControllerQuestion',
    path: 'src/components/controller/ControllerQuestion.tsx',
    description: 'Answer selection interface with 4 large touch-friendly buttons (A/B/C/D). Shows timer and submits answer on selection.',
    exports: ['ControllerQuestion'],
    keyFunctions: ['handleAnswer'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'ControllerReveal',
    path: 'src/components/controller/ControllerReveal.tsx',
    description: 'Shows answer result (correct/incorrect) with points earned.',
    exports: ['ControllerReveal'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'ControllerResults',
    path: 'src/components/controller/ControllerResults.tsx',
    description: 'End-of-round results view showing player\'s final score and rank.',
    exports: ['ControllerResults'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'ControllerPollScreen',
    path: 'src/components/controller/ControllerPollScreen.tsx',
    description: 'Poll suggestion and voting interface. Host can add up to 8 categories; guests vote on suggestions. Displays suggestion list with max-h-[50vh] scrollable area.',
    exports: ['ControllerPollScreen'],
    keyFunctions: ['handleSubmitSuggestion', 'handleVote', 'handleStartVoting'],
    dependencies: ['useTVPoll', 'CategoryPickerModal', 'QuizCategoryIcon'],
  },
  {
    name: 'ControllerPollResults',
    path: 'src/components/controller/ControllerPollResults.tsx',
    description: 'Poll results view for host showing winning categories and start game button.',
    exports: ['ControllerPollResults'],
    keyFunctions: ['handleFinalizeAndStart'],
    dependencies: ['useTVPoll', 'QuizCategoryIcon'],
  },
  {
    name: 'ControllerPollResultsGuest',
    path: 'src/components/controller/ControllerPollResultsGuest.tsx',
    description: 'Poll results view for non-host players showing winning categories.',
    exports: ['ControllerPollResultsGuest'],
    dependencies: ['useTVPoll', 'QuizCategoryIcon'],
  },
  {
    name: 'ControllerDirectSelection',
    path: 'src/components/controller/ControllerDirectSelection.tsx',
    description: 'Direct category selection interface (bypasses poll) for host.',
    exports: ['ControllerDirectSelection'],
    keyFunctions: ['handleCategorySelect'],
    dependencies: ['CategoryPickerModal', 'QuizCategoryIcon'],
  },
  {
    name: 'ControllerRoundIntroWaiting',
    path: 'src/components/controller/ControllerRoundIntroWaiting.tsx',
    description: 'Waiting screen for players during round intro. Shows "Waiting for host..." message while host controls round transition.',
    exports: ['ControllerRoundIntroWaiting'],
    dependencies: ['useTVGame'],
  },
  {
    name: 'GuestJoinModal',
    path: 'src/components/controller/GuestJoinModal.tsx',
    description: 'Modal for guest players to enter nickname and optional avatar before joining.',
    exports: ['GuestJoinModal'],
    keyFunctions: ['handleJoin'],
    dependencies: ['Dialog', 'Avatar'],
  },
];

// ============================================================================
// CONTEXTS (2)
// ============================================================================

export const TV_CONTEXTS: DocItem[] = [
  {
    name: 'TVGameContext',
    path: 'src/contexts/TVGameContext.tsx',
    lines: 2402,
    description: `Primary context for all TV game state and logic. Manages session lifecycle, player presence, question flow, scoring, and realtime synchronization.
    
Key State Interface (TVGameState):
- code, sessionId, roomId: Session identifiers
- phase: Current game phase (15 possible values)
- players: Array of TVPlayer objects
- questions: Array of TVQuestion objects
- currentQuestionIndex, timeRemaining
- roundNumber, totalRounds, totalRoundsPlayed
- categoryName, categoryIcon, roomName
- accumulatedScores: Multi-round score tracking
- isPaired: Whether session has host paired
- currentRoundSuggesterId/Nickname/AvatarUrl: Suggester info for poll rounds`,
    exports: ['TVGameContext', 'TVGameProvider', 'useTVGame', 'mapDbStatusToPhase', 'TVPhase', 'TVPlayer', 'TVQuestion'],
    keyFunctions: [
      'createSession - Create new TV session with pairing codes',
      'joinSession - Join existing session by code',
      'startGame - Start game with category or user trivia',
      'startPlaying - Trigger playing phase after countdown',
      'startNextRound - Advance to next round from queue',
      'submitAnswer - Submit player answer with scoring',
      'markReady - Mark player ready for next round',
      'leaveSession - Leave current session',
      'resetGame - Reset game for play again',
      'confirmActivePlayers - Robust 7-attempt player count verification',
      'advanceToReveal - Transition to reveal phase (idempotent)',
      'checkAndAdvanceIfAllAnswered - Auto-advance when all players answered',
      'mapDbStatusToPhase - Map database status to TVPhase enum',
    ],
    dependencies: ['supabase', 'tvDebug', 'tvScoring'],
    relatedItems: ['tv_sessions', 'tv_players', 'player_answers'],
    codeExample: `// TVPhase values
type TVPhase = 'pairing' | 'waiting' | 'lobby' | 'countdown' | 
  'question' | 'playing' | 'reveal' | 'results' | 'completed' | 
  'idle' | 'round-intro' | 'poll-suggest' | 'poll-voting' | 
  'poll-results' | 'category-select';

// Usage
const { phase, players, startGame, submitAnswer } = useTVGame();`,
  },
  {
    name: 'TVMockContext',
    path: 'src/contexts/TVMockContext.tsx',
    lines: 250,
    description: 'Mock context for testing/showcase without database. Provides toggleable game states, player counts, and multi-round category queues for rapid UI testing.',
    exports: ['TVMockContext', 'TVMockProvider', 'useTVMock'],
    keyFunctions: ['setPhase', 'setPlayers', 'setTimeRemaining', 'setCurrentQuestionIndex'],
    dependencies: [],
    relatedItems: ['TVScreensShowcase'],
  },
];

// ============================================================================
// HOOKS (3)
// ============================================================================

export const TV_HOOKS: DocItem[] = [
  {
    name: 'useTVPoll',
    path: 'src/hooks/useTVPoll.ts',
    lines: 635,
    description: `Manages poll suggestions and voting for category selection between rounds.

Poll Phases:
- suggest: Host adds categories (up to 8)
- voting: Players vote (30 second timer)
- results: Show winners, host starts game

Realtime Subscriptions:
- tv_poll_suggestions (INSERT, UPDATE, DELETE)
- tv_poll_votes (INSERT, DELETE)
- tv_sessions (UPDATE for phase changes)`,
    exports: ['useTVPoll', 'PollSuggestion', 'PollVote'],
    keyFunctions: [
      'submitSuggestion - Add category suggestion',
      'removeSuggestion - Remove specific suggestion by ID',
      'toggleVote - Vote/unvote for suggestion',
      'startVoting - Start 30-second voting phase',
      'endVoting - End voting, show results',
      'initiatePoll - Clear old data, start new poll',
      'finalizePollAndStartGame - Lock player count, create queue, start',
    ],
    dependencies: ['supabase', 'tvDebug'],
    relatedItems: ['tv_poll_suggestions', 'tv_poll_votes', 'tv_sessions'],
    codeExample: `const {
  suggestions,
  myVotes,
  pollPhase,
  submitSuggestion,
  toggleVote,
  startVoting,
  finalizePollAndStartGame,
} = useTVPoll({ sessionId, userId, nickname, avatarUrl, isHost });`,
  },
  {
    name: 'useTVSessionQueue',
    path: 'src/hooks/useTVSessionQueue.ts',
    lines: 407,
    description: `Manages round queue with drag-and-drop reordering support.

Features:
- Optimistic updates with temp IDs
- Position tracking via ref to prevent race conditions
- Fallback to room_category_queue if TV queue empty
- Handles synthetic IDs (temp-, initial-) for local-only items
- Realtime subscription for queue changes`,
    exports: ['useTVSessionQueue', 'TVQueueItem'],
    keyFunctions: [
      'addCategoryToQueue - Add category with optimistic update',
      'addToQueue - Generic queue item addition',
      'removeFromQueue - Handle both DB and synthetic items',
      'reorderQueue - Update positions via drag-and-drop',
      'refetch - Force refresh from database',
    ],
    dependencies: ['supabase', 'CATEGORY_ID_TO_ICON'],
    relatedItems: ['tv_session_queue', 'room_category_queue'],
    codeExample: `const {
  queue,
  hasQueue,
  addCategoryToQueue,
  removeFromQueue,
  reorderQueue,
} = useTVSessionQueue(sessionId, roomId);`,
  },
  {
    name: 'useTVDiscovery',
    path: 'src/hooks/useTVDiscovery.ts',
    lines: 259,
    description: `Automatic TV discovery via Supabase Realtime Presence.

Discovery Flow:
1. Join tv-broadcast presence channel
2. Listen for TV presence with pairing codes
3. Connect via discovered TV or manual code
4. Auto-stop after 30 seconds`,
    exports: ['useTVDiscovery', 'DiscoveredTV'],
    keyFunctions: [
      'startScanning - Join presence channel, listen for TVs',
      'stopScanning - Clean up channel subscription',
      'connectToTV - Pair with discovered TV',
      'connectWithCode - Manual code pairing',
    ],
    dependencies: ['supabase', 'useAuth'],
    relatedItems: ['tv_sessions'],
    codeExample: `const {
  discoveredTVs,
  isScanning,
  connectionState,
  startScanning,
  connectToTV,
  connectWithCode,
} = useTVDiscovery();`,
  },
];

// ============================================================================
// DATABASE TABLES (7)
// ============================================================================

export const DATABASE_TABLES: DatabaseTable[] = [
  {
    name: 'tv_sessions',
    description: 'Main table for TV game sessions. Stores session state, questions, scores, and configuration.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'room_id', type: 'UUID', description: 'FK to game_rooms (optional)' },
      { name: 'pairing_code', type: 'TEXT', description: '6-character alphanumeric code' },
      { name: 'tv_pairing_code', type: 'TEXT', description: '4-digit numeric code for TV display' },
      { name: 'host_user_id', type: 'UUID', description: 'FK to auth.users - session host' },
      { name: 'status', type: 'TEXT', description: 'Current phase: waiting, paired, lobby, countdown, playing, reveal, results, completed, poll-suggest, poll-voting, poll-results, round-intro' },
      { name: 'is_paired', type: 'BOOLEAN', description: 'Whether host has paired with TV' },
      { name: 'current_question_index', type: 'INTEGER', description: 'Index of current question (0-based)' },
      { name: 'question_start_time', type: 'TIMESTAMPTZ', description: 'When current question started' },
      { name: 'reveal_start_time', type: 'TIMESTAMPTZ', description: 'When reveal phase started' },
      { name: 'questions', type: 'JSONB', description: 'Array of question objects with options' },
      { name: 'category_name', type: 'TEXT', description: 'Current round category name' },
      { name: 'category_icon', type: 'TEXT', description: 'Icon slug for current category' },
      { name: 'game_name', type: 'TEXT', description: 'Optional game name' },
      { name: 'room_name', type: 'TEXT', description: 'Display name for session' },
      { name: 'round_number', type: 'INTEGER', description: 'Current round (1-based)' },
      { name: 'total_rounds', type: 'INTEGER', description: 'Total rounds planned' },
      { name: 'total_rounds_played', type: 'INTEGER', description: 'Rounds completed' },
      { name: 'accumulated_scores', type: 'JSONB', description: 'Multi-round cumulative scores' },
      { name: 'active_player_count', type: 'INTEGER', description: 'Verified player count for auto-advance' },
      { name: 'poll_start_time', type: 'TIMESTAMPTZ', description: 'When poll voting started' },
      { name: 'poll_duration', type: 'INTEGER', description: 'Poll duration in seconds (default 30)' },
      { name: 'current_round_suggester_id', type: 'TEXT', description: 'Player ID who suggested current round' },
      { name: 'current_round_suggester_nickname', type: 'TEXT', description: 'Suggester display name' },
      { name: 'current_round_suggester_avatar_url', type: 'TEXT', description: 'Suggester avatar URL' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Session creation time' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', description: 'Session expiry time' },
    ],
    relatedTables: ['tv_players', 'tv_session_queue', 'tv_poll_suggestions', 'player_answers'],
  },
  {
    name: 'tv_players',
    description: 'Players registered in TV sessions. Tracks scores, activity status, and readiness.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'tv_session_id', type: 'UUID', description: 'FK to tv_sessions' },
      { name: 'user_id', type: 'UUID', description: 'FK to auth.users (null for guests)' },
      { name: 'player_id', type: 'TEXT', description: 'Consistent ID (user_id or guest UUID)' },
      { name: 'nickname', type: 'TEXT', description: 'Display name' },
      { name: 'avatar_url', type: 'TEXT', description: 'Avatar image URL' },
      { name: 'is_host', type: 'BOOLEAN', description: 'Whether this player is the host' },
      { name: 'is_authenticated', type: 'BOOLEAN', description: 'Whether player is logged in' },
      { name: 'total_score', type: 'INTEGER', description: 'Cumulative score across rounds' },
      { name: 'rounds_played', type: 'INTEGER', description: 'Number of rounds participated' },
      { name: 'questions_answered', type: 'INTEGER', description: 'Total questions answered' },
      { name: 'current_round_score', type: 'INTEGER', description: 'Score for current round' },
      { name: 'is_ready', type: 'BOOLEAN', description: 'Ready for next round' },
      { name: 'is_active', type: 'BOOLEAN', description: 'Currently connected/participating' },
      { name: 'joined_at', type: 'TIMESTAMPTZ', description: 'When player joined' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last update time' },
    ],
    relatedTables: ['tv_sessions', 'player_answers'],
  },
  {
    name: 'tv_poll_suggestions',
    description: 'Category suggestions for poll-based round selection.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'session_id', type: 'UUID', description: 'FK to tv_sessions' },
      { name: 'user_id', type: 'TEXT', description: 'Player ID who suggested' },
      { name: 'nickname', type: 'TEXT', description: 'Suggester display name' },
      { name: 'avatar_url', type: 'TEXT', description: 'Suggester avatar' },
      { name: 'source_type', type: 'TEXT', description: 'category | trivia | collection' },
      { name: 'category_id', type: 'UUID', description: 'FK to categories (if type=category)' },
      { name: 'user_trivia_id', type: 'UUID', description: 'FK to user_quiz_posts (if type=trivia)' },
      { name: 'category_name', type: 'TEXT', description: 'Display name' },
      { name: 'icon_slug', type: 'TEXT', description: 'Icon identifier' },
      { name: 'cover_image', type: 'TEXT', description: 'Cover image URL' },
      { name: 'vote_count', type: 'INTEGER', description: 'Number of votes (auto-updated by trigger)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Suggestion time' },
    ],
    relatedTables: ['tv_sessions', 'tv_poll_votes'],
  },
  {
    name: 'tv_poll_votes',
    description: 'Votes cast for poll suggestions. Trigger auto-updates vote_count.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'session_id', type: 'UUID', description: 'FK to tv_sessions' },
      { name: 'suggestion_id', type: 'UUID', description: 'FK to tv_poll_suggestions' },
      { name: 'user_id', type: 'TEXT', description: 'Voter player ID' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Vote time' },
    ],
    relatedTables: ['tv_sessions', 'tv_poll_suggestions'],
  },
  {
    name: 'tv_session_queue',
    description: 'Queue of rounds to play in multi-round sessions.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'session_id', type: 'UUID', description: 'FK to tv_sessions' },
      { name: 'position', type: 'INTEGER', description: 'Order in queue (0-based)' },
      { name: 'source_type', type: 'TEXT', description: 'category | user_trivia | random' },
      { name: 'category_id', type: 'UUID', description: 'FK to categories' },
      { name: 'category_name', type: 'TEXT', description: 'Display name' },
      { name: 'icon_slug', type: 'TEXT', description: 'Icon identifier' },
      { name: 'user_trivia_id', type: 'UUID', description: 'FK to user_quiz_posts' },
      { name: 'suggester_user_id', type: 'TEXT', description: 'Who suggested this (for skip rule)' },
      { name: 'suggester_nickname', type: 'TEXT', description: 'Suggester display name' },
      { name: 'suggester_avatar_url', type: 'TEXT', description: 'Suggester avatar' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Queue entry time' },
    ],
    relatedTables: ['tv_sessions'],
  },
  {
    name: 'tv_round_history',
    description: 'Historical record of completed rounds with scores.',
    columns: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'tv_session_id', type: 'UUID', description: 'FK to tv_sessions' },
      { name: 'round_number', type: 'INTEGER', description: 'Round number (1-based)' },
      { name: 'category_name', type: 'TEXT', description: 'Category played' },
      { name: 'category_id', type: 'UUID', description: 'FK to categories' },
      { name: 'category_icon', type: 'TEXT', description: 'Icon used' },
      { name: 'player_scores', type: 'JSONB', description: 'Scores per player' },
      { name: 'total_questions', type: 'INTEGER', description: 'Questions in round' },
      { name: 'started_at', type: 'TIMESTAMPTZ', description: 'Round start time' },
      { name: 'completed_at', type: 'TIMESTAMPTZ', description: 'Round end time' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Record creation time' },
    ],
    relatedTables: ['tv_sessions'],
  },
  {
    name: 'player_answers (TV columns)',
    description: 'Player answers table with TV-specific column for session association.',
    columns: [
      { name: 'tv_session_id', type: 'UUID (nullable)', description: 'FK to tv_sessions - links answer to TV mode session' },
    ],
    relatedTables: ['tv_sessions', 'tv_players'],
  },
];

// ============================================================================
// RLS POLICIES (21)
// ============================================================================

export const RLS_POLICIES: RLSPolicy[] = [
  // tv_sessions
  {
    table: 'tv_sessions',
    name: 'Allow public read of tv_sessions',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow public read of tv_sessions" ON tv_sessions FOR SELECT USING (true);`,
    description: 'Anyone can read TV sessions for joining and syncing game state.',
  },
  {
    table: 'tv_sessions',
    name: 'Allow authenticated users to create sessions',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow authenticated users to create sessions" ON tv_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,
    description: 'Only authenticated users can create new TV sessions.',
  },
  {
    table: 'tv_sessions',
    name: 'Allow host to update session',
    operation: 'UPDATE',
    sql: `CREATE POLICY "Allow host to update session" ON tv_sessions FOR UPDATE USING (auth.uid() = host_user_id);`,
    description: 'Only the session host can update session state.',
  },
  {
    table: 'tv_sessions',
    name: 'Allow public update for pairing',
    operation: 'UPDATE',
    sql: `CREATE POLICY "Allow public update for pairing" ON tv_sessions FOR UPDATE USING (is_paired = false AND status = 'waiting');`,
    description: 'Allow pairing updates on unpaired sessions.',
  },
  // tv_players
  {
    table: 'tv_players',
    name: 'Allow public read of tv_players',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow public read of tv_players" ON tv_players FOR SELECT USING (true);`,
    description: 'Anyone can see players in a session.',
  },
  {
    table: 'tv_players',
    name: 'Allow guests to insert themselves',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow guests to insert" ON tv_players FOR INSERT WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL AND player_id IS NOT NULL) OR
  (auth.uid() IS NOT NULL)
);`,
    description: 'Guests can register with player_id when unauthenticated. Authenticated users can also insert.',
  },
  {
    table: 'tv_players',
    name: 'Allow players to update own data',
    operation: 'UPDATE',
    sql: `CREATE POLICY "Allow players to update" ON tv_players FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() IS NULL
);`,
    description: 'Players can update their own player record.',
  },
  {
    table: 'tv_players',
    name: 'Allow host to delete players',
    operation: 'DELETE',
    sql: `CREATE POLICY "Allow host to delete" ON tv_players FOR DELETE USING (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = tv_session_id AND host_user_id = auth.uid())
);`,
    description: 'Session host can remove players.',
  },
  // tv_poll_suggestions
  {
    table: 'tv_poll_suggestions',
    name: 'Allow participants to read suggestions',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow participants to read" ON tv_poll_suggestions FOR SELECT USING (
  is_tv_session_participant(session_id, COALESCE(auth.uid()::text, ''))
  OR EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Session participants and host can read suggestions.',
  },
  {
    table: 'tv_poll_suggestions',
    name: 'Allow host to insert suggestions',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow host to insert" ON tv_poll_suggestions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Only the host can add category suggestions.',
  },
  {
    table: 'tv_poll_suggestions',
    name: 'Allow suggester to delete own',
    operation: 'DELETE',
    sql: `CREATE POLICY "Allow suggester to delete" ON tv_poll_suggestions FOR DELETE USING (
  user_id = auth.uid()::text OR 
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Suggester or host can remove suggestions.',
  },
  // tv_poll_votes
  {
    table: 'tv_poll_votes',
    name: 'Allow participants to read votes',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow participants to read" ON tv_poll_votes FOR SELECT USING (true);`,
    description: 'Anyone can see vote counts.',
  },
  {
    table: 'tv_poll_votes',
    name: 'Allow participants to vote',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow participants to vote" ON tv_poll_votes FOR INSERT WITH CHECK (
  is_tv_session_participant(session_id, user_id)
);`,
    description: 'Only registered session participants can vote.',
  },
  {
    table: 'tv_poll_votes',
    name: 'Allow voters to remove vote',
    operation: 'DELETE',
    sql: `CREATE POLICY "Allow voters to delete" ON tv_poll_votes FOR DELETE USING (
  user_id = auth.uid()::text OR user_id = COALESCE(auth.uid()::text, '')
);`,
    description: 'Voters can remove their own votes.',
  },
  // tv_session_queue
  {
    table: 'tv_session_queue',
    name: 'Allow public read of queue',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow public read" ON tv_session_queue FOR SELECT USING (true);`,
    description: 'Anyone can see the round queue.',
  },
  {
    table: 'tv_session_queue',
    name: 'Allow host to manage queue',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow host to insert" ON tv_session_queue FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Only host can add to queue.',
  },
  {
    table: 'tv_session_queue',
    name: 'Allow host to update queue',
    operation: 'UPDATE',
    sql: `CREATE POLICY "Allow host to update" ON tv_session_queue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Only host can reorder queue.',
  },
  {
    table: 'tv_session_queue',
    name: 'Allow host to delete from queue',
    operation: 'DELETE',
    sql: `CREATE POLICY "Allow host to delete" ON tv_session_queue FOR DELETE USING (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = session_id AND host_user_id = auth.uid())
);`,
    description: 'Only host can remove from queue.',
  },
  // tv_round_history
  {
    table: 'tv_round_history',
    name: 'Allow public read of history',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow public read" ON tv_round_history FOR SELECT USING (true);`,
    description: 'Anyone can read round history.',
  },
  {
    table: 'tv_round_history',
    name: 'Allow host to insert history',
    operation: 'INSERT',
    sql: `CREATE POLICY "Allow host to insert" ON tv_round_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tv_sessions WHERE id = tv_session_id AND host_user_id = auth.uid())
);`,
    description: 'Only host can create history records.',
  },
  // player_answers (TV-specific)
  {
    table: 'player_answers',
    name: 'Allow TV session read',
    operation: 'SELECT',
    sql: `CREATE POLICY "Allow TV session read" ON player_answers FOR SELECT USING (
  tv_session_id IS NOT NULL
);`,
    description: 'Allow reading answers with TV session ID for auto-advance logic.',
  },
];

// ============================================================================
// DATABASE FUNCTIONS (2)
// ============================================================================

export const DATABASE_FUNCTIONS: DocItem[] = [
  {
    name: 'is_tv_session_participant',
    path: 'Database Function',
    description: `Security definer function that checks if a player is registered in a TV session.
    
Used by poll RLS policies to verify participants can vote.

Parameters:
- p_session_id: UUID - The TV session ID
- p_player_identifier: TEXT - The player_id to check

Returns: BOOLEAN - true if player exists in tv_players for session`,
    codeExample: `CREATE OR REPLACE FUNCTION public.is_tv_session_participant(
  p_session_id uuid, 
  p_player_identifier text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tv_players tp
    WHERE tp.tv_session_id = p_session_id
    AND tp.player_id = p_player_identifier
  )
$$;`,
  },
  {
    name: 'update_suggestion_vote_count',
    path: 'Database Trigger Function',
    description: `Trigger function on tv_poll_votes that auto-updates vote_count on tv_poll_suggestions.
    
Trigger Events:
- INSERT: Increments vote_count by 1
- DELETE: Decrements vote_count by 1 (min 0)`,
    codeExample: `CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tv_poll_suggestions 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tv_poll_suggestions 
    SET vote_count = GREATEST(0, vote_count - 1) 
    WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;`,
  },
];

// ============================================================================
// UTILITIES (2)
// ============================================================================

export const TV_UTILITIES: DocItem[] = [
  {
    name: 'tvDebug',
    path: 'src/utils/tvDebug.ts',
    lines: 86,
    description: `Structured logging utility for debugging TV game flow. Development-only (disabled in production).

Features:
- In-memory log history (100 entries max)
- Color-coded console output by level
- Typed functions for common events`,
    exports: [
      'tvLog(event, data?, level?) - General logging',
      'tvLogPhase(from, to, trigger?) - Phase transitions',
      'tvLogPlayer(action, playerId, data?) - Player events',
      'tvLogError(context, error) - Error logging',
      'tvLogPresence(event, playerCount, players?) - Presence sync',
      'tvLogTimer(action, remaining?) - Timer events',
      'getTVLogHistory() - Get log array',
      'clearTVLogs() - Clear history',
    ],
    codeExample: `tvLog('Question loaded', { index: 0 });
tvLogPhase('countdown', 'question', 'timer');
tvLogPlayer('join', playerId, { nickname });
tvLogError('submitAnswer', error);`,
  },
  {
    name: 'tvScoring',
    path: 'src/utils/tvScoring.ts',
    lines: 129,
    description: `Unified scoring utility for consistent point calculation.

Scoring Formula:
- Correct answer: 100 base + (timeRemaining × 5)
- Incorrect answer: 0 points

Session Binding:
- Stores player-session associations in localStorage
- 24-hour expiry for join idempotency`,
    exports: [
      'calculatePoints(isCorrect, timeRemaining) - Point calculation',
      'calculateTimeRemaining(questionStartTime, totalTime?) - Time from server',
      'getQuestionTime() - Returns 15 seconds',
      'getSessionBinding(sessionId) - Get stored player ID',
      'setSessionBinding(sessionId, playerId) - Store binding',
      'clearExpiredBindings() - Cleanup utility',
    ],
    codeExample: `const points = calculatePoints(true, 12); // 100 + 60 = 160
const remaining = calculateTimeRemaining(startTime);
const questionTime = getQuestionTime(); // 15`,
  },
];

// ============================================================================
// DATA FLOWS
// ============================================================================

export const DATA_FLOWS: DataFlow[] = [
  {
    name: 'Game Start Flow',
    description: 'Sequence from host starting game to first question display.',
    mermaidDiagram: `sequenceDiagram
    participant H as Host Controller
    participant C as TVGameContext
    participant DB as Supabase
    participant TV as TV Display

    H->>C: startGame(categoryId)
    C->>DB: Fetch questions
    C->>DB: Update session (questions, status='countdown')
    DB-->>TV: Realtime: session updated
    TV->>TV: Show TVCountdownScreenV2
    Note over TV: 3-2-1 countdown
    C->>C: startPlaying()
    C->>DB: confirmActivePlayers()
    C->>DB: Update status='playing'
    DB-->>TV: Realtime: status changed
    TV->>TV: Show TVQuestionScreenV4`,
  },
  {
    name: 'Poll Flow',
    description: 'Category voting process between rounds.',
    mermaidDiagram: `sequenceDiagram
    participant H as Host
    participant P as Players
    participant DB as Supabase
    participant TV as TV Display

    H->>DB: initiatePoll()
    DB->>DB: Clear old suggestions/votes
    DB-->>TV: status='poll-suggest'
    TV->>TV: Show TVPollScreen
    H->>DB: submitSuggestion() x N
    DB-->>TV: Realtime: suggestions updated
    H->>DB: startVoting()
    DB-->>TV: status='poll-voting'
    P->>DB: toggleVote()
    DB-->>DB: Trigger: update vote_count
    Note over TV: 30 second timer
    H->>DB: endVoting()
    DB-->>TV: status='poll-results'
    H->>DB: finalizePollAndStartGame(topN)
    DB->>DB: Create queue from winners
    DB->>DB: Lock active_player_count
    DB-->>TV: status='paired' (lobby)`,
  },
  {
    name: 'Auto-Advance Logic',
    description: 'How the game automatically advances when all players answer.',
    mermaidDiagram: `flowchart TD
    A[Player answers] --> B{Is host?}
    B -->|No| Z[End - only host checks]
    B -->|Yes| C{Phase = question?}
    C -->|No| Z
    C -->|Yes| D{Already advanced?}
    D -->|Yes| Z
    D -->|No| E{Time since start > 2.5s?}
    E -->|No| Z
    E -->|Yes| F[Query session.active_player_count]
    F --> G[Query player_answers count]
    G --> H{answers >= expected?}
    H -->|No| I[Wait for more]
    H -->|Yes| J[advanceToReveal]
    J --> K[Update status='reveal']`,
  },
  {
    name: 'Presence Sync',
    description: 'Real-time player avatar position synchronization.',
    mermaidDiagram: `flowchart LR
    subgraph Player Device
        A[Answer submitted] --> B[Track presence state]
        B --> C[Update: hasAnswered, isCorrect]
    end
    
    subgraph Supabase
        C --> D[Presence Channel]
        D --> E[Broadcast to all]
    end
    
    subgraph TV Display
        E --> F[Presence sync event]
        F --> G[Deduplicate by nickname]
        G --> H[Update players array]
        H --> I[Move avatar position]
    end`,
  },
];

// ============================================================================
// PHASE STATE MACHINE
// ============================================================================

export const PHASE_STATE_MACHINE = `stateDiagram-v2
    [*] --> pairing: Create session
    pairing --> waiting: TV created
    waiting --> lobby: Host pairs
    
    lobby --> countdown: Start game
    lobby --> poll_suggest: Start poll
    
    poll_suggest --> poll_voting: Host starts voting
    poll_voting --> poll_results: Timer ends / Host ends
    poll_results --> lobby: Finalize poll
    
    countdown --> question: Timer ends
    question --> reveal: All answered / Timer ends
    reveal --> question: Next question
    reveal --> results: Last question
    
    results --> round_intro: More rounds in queue
    results --> completed: No more rounds
    
    round_intro --> countdown: Host ready
    
    completed --> lobby: Play again
    completed --> [*]: Leave

    note right of question: 15 second timer
    note right of reveal: 1.4 second highlight
    note right of poll_voting: 30 second timer`;

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const CONFIG_CONSTANTS = [
  { name: 'QUESTION_TIME', value: '15', unit: 'seconds', description: 'Time limit for each question' },
  { name: 'REVEAL_DURATION_MS', value: '1400', unit: 'ms', description: 'Duration of answer reveal before next question' },
  { name: 'BASE_POINTS', value: '100', unit: 'points', description: 'Base points for correct answer' },
  { name: 'TIME_BONUS_MULTIPLIER', value: '5', unit: 'points/second', description: 'Bonus points per second remaining' },
  { name: 'CODE_REFRESH_INTERVAL', value: '5', unit: 'minutes', description: 'Auto-refresh pairing code if no players' },
  { name: 'SESSION_BINDING_EXPIRY', value: '24', unit: 'hours', description: 'Player-session binding expiry for rejoin' },
  { name: 'POLL_DURATION', value: '30', unit: 'seconds', description: 'Default voting phase duration' },
  { name: 'MAX_HOST_SUGGESTIONS', value: '8', unit: 'categories', description: 'Maximum suggestions host can add' },
  { name: 'PLAYER_VERIFICATION_ATTEMPTS', value: '7', unit: 'attempts', description: 'confirmActivePlayers retry count' },
  { name: 'VERIFICATION_DELAY', value: '200', unit: 'ms', description: 'Delay between verification attempts' },
  { name: 'AUTO_ADVANCE_SAFETY_WINDOW', value: '2500', unit: 'ms', description: 'Minimum time before auto-advance check' },
];
