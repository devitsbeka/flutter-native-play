// Components Documentation
// Documents all major React components in the application

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  descriptionKa: string;
}

export interface ComponentDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  filePath: string;
  props?: ComponentProp[];
  children?: string[];
  usedIn?: string[];
}

// ============= LAYOUT COMPONENTS =============

export const COMP_APP_LAYOUT: ComponentDoc = {
  name: 'AppLayout',
  category: 'Layout',
  categoryKa: 'განლაგება',
  description: 'Main layout wrapper with bottom navigation and optional header. Used by most pages.',
  descriptionKa: 'მთავარი განლაგების wrapper ქვედა ნავიგაციით და არასავალდებულო header-ით. გამოიყენება უმეტეს გვერდებზე.',
  filePath: 'src/components/layout/AppLayout.tsx',
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: 'Page content', descriptionKa: 'გვერდის კონტენტი' },
    { name: 'showNav', type: 'boolean', required: false, description: 'Show bottom navigation', descriptionKa: 'აჩვენე ქვედა ნავიგაცია' },
    { name: 'headerContent', type: 'ReactNode', required: false, description: 'Optional header', descriptionKa: 'არასავალდებულო header' },
  ],
  children: ['BottomNavigation'],
  usedIn: ['Index', 'Profile', 'Leaderboards', 'Discover']
};

export const COMP_BOTTOM_NAVIGATION: ComponentDoc = {
  name: 'BottomNavigation',
  category: 'Layout',
  categoryKa: 'განლაგება',
  description: 'Fixed bottom navigation bar with 5 main navigation items.',
  descriptionKa: 'ფიქსირებული ქვედა ნავიგაციის ზოლი 5 მთავარი ნავიგაციის ელემენტით.',
  filePath: 'src/components/layout/BottomNavigation.tsx',
  usedIn: ['AppLayout']
};

export const COMP_UNIFIED_DESKTOP_NAV: ComponentDoc = {
  name: 'UnifiedDesktopNav',
  category: 'Layout',
  categoryKa: 'განლაგება',
  description: 'Desktop left sidebar navigation. Shows on larger screens. Includes profile, nav items, and settings.',
  descriptionKa: 'დესკტოპის მარცხენა გვერდითი ზოლის ნავიგაცია. ჩანს უფრო დიდ ეკრანებზე. შეიცავს პროფილს, ნავიგაციის ელემენტებს და პარამეტრებს.',
  filePath: 'src/components/layout/UnifiedDesktopNav.tsx',
  props: [
    { name: 'onPlayClick', type: '() => void', required: false, description: 'Play button handler', descriptionKa: 'Play ღილაკის handler' },
    { name: 'playsRemaining', type: 'number', required: false, description: 'Daily plays left', descriptionKa: 'დარჩენილი ყოველდღიური თამაშები' },
    { name: 'canPlay', type: 'boolean', required: false, description: 'Can user play', descriptionKa: 'შეუძლია თუ არა მომხმარებელს თამაში' },
    { name: 'isVip', type: 'boolean', required: false, description: 'VIP status', descriptionKa: 'VIP სტატუსი' },
  ],
  usedIn: ['Index', 'Team pages']
};

// ============= GAME COMPONENTS =============

export const COMP_QUIZ_QUESTION_CARD: ComponentDoc = {
  name: 'QuizQuestionCard',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Displays the current quiz question with icon, text, and timer.',
  descriptionKa: 'აჩვენებს მიმდინარე ქვიზის კითხვას ხატულათ, ტექსტით და ტაიმერით.',
  filePath: 'src/components/game/QuizQuestionCard.tsx',
  props: [
    { name: 'question', type: 'string', required: true, description: 'Question text', descriptionKa: 'კითხვის ტექსტი' },
    { name: 'iconUrl', type: 'string', required: false, description: 'Question icon URL', descriptionKa: 'კითხვის ხატულას URL' },
    { name: 'progress', type: 'number', required: false, description: 'Timer progress 0-1', descriptionKa: 'ტაიმერის პროგრესი 0-1' },
    { name: 'questionNumber', type: 'number', required: false, description: 'Current question number', descriptionKa: 'მიმდინარე კითხვის ნომერი' },
    { name: 'totalQuestions', type: 'number', required: false, description: 'Total questions count', descriptionKa: 'კითხვების ჯამური რაოდენობა' },
  ],
  usedIn: ['CategoryQuizPage', 'MultiplayerGameScreenV2', 'TVQuestionScreen']
};

export const COMP_QUIZ_ANSWER_BUTTON: ComponentDoc = {
  name: 'QuizAnswerButton',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Answer option button with correct/wrong states and animations.',
  descriptionKa: 'პასუხის ოფციის ღილაკი სწორი/არასწორი მდგომარეობებით და ანიმაციებით.',
  filePath: 'src/components/game/QuizAnswerButton.tsx',
  props: [
    { name: 'answer', type: 'string', required: true, description: 'Answer text', descriptionKa: 'პასუხის ტექსტი' },
    { name: 'label', type: 'string', required: true, description: 'A, B, C, D label', descriptionKa: 'A, B, C, D ლეიბლი' },
    { name: 'state', type: 'QuizAnswerState', required: true, description: 'default, selected, correct, wrong', descriptionKa: 'default, selected, correct, wrong' },
    { name: 'onClick', type: '() => void', required: true, description: 'Click handler', descriptionKa: 'დაწკაპუნების handler' },
    { name: 'disabled', type: 'boolean', required: false, description: 'Disable interaction', descriptionKa: 'ინტერაქციის გათიშვა' },
  ],
  usedIn: ['CategoryQuizPage', 'MultiplayerGameScreenV2']
};

export const COMP_MULTIPLAYER_GAME_SCREEN_V2: ComponentDoc = {
  name: 'MultiplayerGameScreenV2',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Main multiplayer game screen. Shows question, answers, opponent avatars, and leaderboard.',
  descriptionKa: 'მთავარი მულტიპლეიერ თამაშის ეკრანი. აჩვენებს კითხვას, პასუხებს, მოწინააღმდეგის ავატარებს და ლიდერბორდს.',
  filePath: 'src/components/team/MultiplayerGameScreenV2.tsx',
  usedIn: ['TeamV2 when game is playing']
};

export const COMP_GAME_RESULTS_SCREEN_V2: ComponentDoc = {
  name: 'GameResultsScreenV2',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Shows game results with rankings, coins earned, and play again options.',
  descriptionKa: 'აჩვენებს თამაშის შედეგებს რეიტინგებით, მიღებული მონეტებით და ხელახლა თამაშის ოფციებით.',
  filePath: 'src/components/team/GameResultsScreenV2.tsx',
  usedIn: ['TeamV2 when game is completed']
};

// ============= UI COMPONENTS =============

export const COMP_SMART_AVATAR: ComponentDoc = {
  name: 'SmartAvatar',
  category: 'UI',
  categoryKa: 'UI',
  description: 'User avatar with frame, online indicator, and fallback. Supports animated avatars.',
  descriptionKa: 'მომხმარებლის ავატარი ჩარჩოთი, ონლაინ ინდიკატორით და fallback-ით. მხარს უჭერს ანიმაციურ ავატარებს.',
  filePath: 'src/components/ui/smart-avatar.tsx',
  props: [
    { name: 'src', type: 'string', required: false, description: 'Avatar image URL', descriptionKa: 'ავატარის სურათის URL' },
    { name: 'animatedSrc', type: 'string', required: false, description: 'Animated avatar URL', descriptionKa: 'ანიმაციური ავატარის URL' },
    { name: 'name', type: 'string', required: false, description: 'User name for fallback', descriptionKa: 'მომხმარებლის სახელი fallback-ისთვის' },
    { name: 'frameId', type: 'string', required: false, description: 'Avatar frame ID', descriptionKa: 'ავატარის ჩარჩოს ID' },
    { name: 'size', type: 'number', required: false, description: 'Avatar size in pixels', descriptionKa: 'ავატარის ზომა პიქსელებში' },
    { name: 'showOnlineStatus', type: 'boolean', required: false, description: 'Show online indicator', descriptionKa: 'აჩვენე ონლაინ ინდიკატორი' },
    { name: 'isOnline', type: 'boolean', required: false, description: 'Online status', descriptionKa: 'ონლაინ სტატუსი' },
  ],
  usedIn: ['Throughout app for user avatars']
};

export const COMP_CHUNKY_BUTTON: ComponentDoc = {
  name: 'ChunkyButton',
  category: 'UI',
  categoryKa: 'UI',
  description: 'Primary 3D-style action button with raised appearance and press animation.',
  descriptionKa: '3D-სტილის მთავარი მოქმედების ღილაკი ამოწეული გარეგნობით და დაჭერის ანიმაციით.',
  filePath: 'src/components/ui/chunky-button.tsx',
  props: [
    { name: 'children', type: 'ReactNode', required: true, description: 'Button content', descriptionKa: 'ღილაკის კონტენტი' },
    { name: 'variant', type: 'string', required: false, description: 'primary, secondary, success, danger', descriptionKa: 'primary, secondary, success, danger' },
    { name: 'size', type: 'string', required: false, description: 'sm, md, lg', descriptionKa: 'sm, md, lg' },
    { name: 'disabled', type: 'boolean', required: false, description: 'Disable button', descriptionKa: 'ღილაკის გათიშვა' },
    { name: 'loading', type: 'boolean', required: false, description: 'Show loading state', descriptionKa: 'აჩვენე ჩატვირთვის მდგომარეობა' },
    { name: 'onClick', type: '() => void', required: false, description: 'Click handler', descriptionKa: 'დაწკაპუნების handler' },
  ],
  usedIn: ['Game screens', 'Modals', 'CTAs']
};

export const COMP_GAME_MODAL: ComponentDoc = {
  name: 'GameModal',
  category: 'UI',
  categoryKa: 'UI',
  description: 'Full-screen modal with gradient background and slide animation. Used for game overlays.',
  descriptionKa: 'სრულ ეკრანზე მოდალი გრადიენტი ფონით და სლაიდის ანიმაციით. გამოიყენება თამაშის overlay-ებისთვის.',
  filePath: 'src/components/ui/game-modal.tsx',
  props: [
    { name: 'isOpen', type: 'boolean', required: true, description: 'Modal visibility', descriptionKa: 'მოდალის ხილვადობა' },
    { name: 'onClose', type: '() => void', required: true, description: 'Close handler', descriptionKa: 'დახურვის handler' },
    { name: 'title', type: 'string', required: false, description: 'Modal title', descriptionKa: 'მოდალის სათაური' },
    { name: 'subtitle', type: 'string', required: false, description: 'Modal subtitle', descriptionKa: 'მოდალის ქვესათაური' },
    { name: 'children', type: 'ReactNode', required: true, description: 'Modal content', descriptionKa: 'მოდალის კონტენტი' },
  ],
  usedIn: ['GradientPicker', 'JoinRoomModal', 'HelpModal']
};

// ============= SOCIAL COMPONENTS =============

export const COMP_FRIENDS_LIST: ComponentDoc = {
  name: 'FriendsList',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Displays friend list with quick play and chat actions. Shows pending requests.',
  descriptionKa: 'აჩვენებს მეგობრების სიას სწრაფი თამაშის და ჩათის მოქმედებებით. აჩვენებს მომლოდინე მოთხოვნებს.',
  filePath: 'src/components/team/FriendsList.tsx',
  props: [
    { name: 'onAddFriendClick', type: '() => void', required: true, description: 'Add friend handler', descriptionKa: 'მეგობრის დამატების handler' },
    { name: 'onQuickPlay', type: '(friend) => void', required: true, description: 'Quick play handler', descriptionKa: 'სწრაფი თამაშის handler' },
    { name: 'onStartChat', type: '(friend) => void', required: false, description: 'Start chat handler', descriptionKa: 'ჩათის დაწყების handler' },
  ],
  usedIn: ['TeamV2']
};

export const COMP_CREATE_ROOM_SCREEN: ComponentDoc = {
  name: 'CreateRoomScreen',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Room creation form with category selection, room name, and settings.',
  descriptionKa: 'ოთახის შექმნის ფორმა კატეგორიის არჩევით, ოთახის სახელით და პარამეტრებით.',
  filePath: 'src/components/team/CreateRoomScreen.tsx',
  usedIn: ['TeamV2']
};

// ============= LEADERBOARD COMPONENTS =============

export const COMP_LEAGUE_PLAYER_ROW: ComponentDoc = {
  name: 'LeaguePlayerRow',
  category: 'Leaderboard',
  categoryKa: 'ლიდერბორდი',
  description: 'Single player row in league leaderboard with rank, avatar, name, and coins.',
  descriptionKa: 'ერთი მოთამაშის რიგი ლიგის ლიდერბორდში რანგით, ავატარით, სახელით და მონეტებით.',
  filePath: 'src/components/leaderboard/LeaguePlayerRow.tsx',
  props: [
    { name: 'entry', type: 'LeaderboardEntry', required: true, description: 'Player data', descriptionKa: 'მოთამაშის მონაცემები' },
    { name: 'isCurrentUser', type: 'boolean', required: false, description: 'Highlight as current user', descriptionKa: 'მონიშნე როგორც მიმდინარე მომხმარებელი' },
    { name: 'isPromotionZone', type: 'boolean', required: false, description: 'In promotion zone', descriptionKa: 'დაწინაურების ზონაში' },
    { name: 'isDemotionZone', type: 'boolean', required: false, description: 'In demotion zone', descriptionKa: 'დაქვეითების ზონაში' },
  ],
  usedIn: ['Leaderboards page']
};

// ============= TV COMPONENTS =============

export const COMP_TV_DISPLAY: ComponentDoc = {
  name: 'TVDisplay',
  category: 'TV Mode',
  categoryKa: 'TV რეჟიმი',
  description: 'Main TV display screen optimized for large screens. Shows questions, players, and leaderboard.',
  descriptionKa: 'მთავარი TV დისპლეის ეკრანი ოპტიმიზებული დიდი ეკრანებისთვის. აჩვენებს კითხვებს, მოთამაშეებს და ლიდერბორდს.',
  filePath: 'src/pages/TVDisplay.tsx',
  usedIn: ['TV route']
};

export const COMP_TV_HOST_CONTROLLER: ComponentDoc = {
  name: 'TVHostController',
  category: 'TV Mode',
  categoryKa: 'TV რეჟიმი',
  description: 'Host control panel for TV mode. Start/stop game, change categories, manage players.',
  descriptionKa: 'ჰოსტის კონტროლის პანელი TV რეჟიმისთვის. თამაშის დაწყება/გაჩერება, კატეგორიების შეცვლა, მოთამაშეების მართვა.',
  filePath: 'src/pages/TVHostController.tsx',
  usedIn: ['TV host route']
};

// Export all components
export const ALL_COMPONENTS: ComponentDoc[] = [
  COMP_APP_LAYOUT,
  COMP_BOTTOM_NAVIGATION,
  COMP_UNIFIED_DESKTOP_NAV,
  COMP_QUIZ_QUESTION_CARD,
  COMP_QUIZ_ANSWER_BUTTON,
  COMP_MULTIPLAYER_GAME_SCREEN_V2,
  COMP_GAME_RESULTS_SCREEN_V2,
  COMP_SMART_AVATAR,
  COMP_CHUNKY_BUTTON,
  COMP_GAME_MODAL,
  COMP_FRIENDS_LIST,
  COMP_CREATE_ROOM_SCREEN,
  COMP_LEAGUE_PLAYER_ROW,
  COMP_TV_DISPLAY,
  COMP_TV_HOST_CONTROLLER,
];

// Component categories for navigation
export const COMPONENT_CATEGORIES = [
  { id: 'layout', name: 'Layout', nameKa: 'განლაგება' },
  { id: 'game', name: 'Game', nameKa: 'თამაში' },
  { id: 'ui', name: 'UI', nameKa: 'UI' },
  { id: 'social', name: 'Social', nameKa: 'სოციალური' },
  { id: 'leaderboard', name: 'Leaderboard', nameKa: 'ლიდერბორდი' },
  { id: 'tv-mode', name: 'TV Mode', nameKa: 'TV რეჟიმი' },
  { id: 'admin', name: 'Admin', nameKa: 'ადმინი' },
];
