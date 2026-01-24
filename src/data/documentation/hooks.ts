// Hooks Documentation
// Documents all React hooks used in the application

export interface HookParam {
  name: string;
  type: string;
  description: string;
  descriptionKa: string;
}

export interface HookReturn {
  name: string;
  type: string;
  description: string;
  descriptionKa: string;
}

export interface HookDoc {
  name: string;
  category: string;
  categoryKa: string;
  description: string;
  descriptionKa: string;
  filePath: string;
  params?: HookParam[];
  returns: HookReturn[];
  usedIn?: string[];
  dependencies?: string[];
}

// ============= AUTHENTICATION HOOKS =============

export const HOOK_USE_AUTH: HookDoc = {
  name: 'useAuth',
  category: 'Authentication',
  categoryKa: 'ავტორიზაცია',
  description: 'Primary authentication hook. Provides current user, profile, and auth methods. Must be used within AuthProvider.',
  descriptionKa: 'მთავარი ავტორიზაციის hook. უზრუნველყოფს მიმდინარე მომხმარებელს, პროფილს და auth მეთოდებს. უნდა გამოიყენოს AuthProvider-ის შიგნით.',
  filePath: 'src/contexts/AuthContext.tsx',
  returns: [
    { name: 'user', type: 'User | null', description: 'Supabase auth user object', descriptionKa: 'Supabase auth მომხმარებლის ობიექტი' },
    { name: 'profile', type: 'Profile | null', description: 'User profile from profiles table', descriptionKa: 'მომხმარებლის პროფილი profiles ცხრილიდან' },
    { name: 'isAuthenticated', type: 'boolean', description: 'Whether user is logged in', descriptionKa: 'შესულია თუ არა მომხმარებელი' },
    { name: 'isLoading', type: 'boolean', description: 'Auth state loading', descriptionKa: 'Auth state იტვირთება' },
    { name: 'signIn', type: '(email, password) => Promise', description: 'Sign in with email/password', descriptionKa: 'შესვლა ელფოსტით/პაროლით' },
    { name: 'signUp', type: '(email, password, nickname) => Promise', description: 'Create new account', descriptionKa: 'ახალი ანგარიშის შექმნა' },
    { name: 'signOut', type: '() => Promise', description: 'Log out current user', descriptionKa: 'მიმდინარე მომხმარებლის გასვლა' },
    { name: 'updateProfile', type: '(updates) => Promise', description: 'Update profile fields', descriptionKa: 'პროფილის ველების განახლება' },
    { name: 'refreshProfile', type: '() => Promise', description: 'Reload profile from DB', descriptionKa: 'პროფილის ხელახლა ჩატვირთვა DB-დან' },
  ],
  usedIn: ['Most components requiring auth', 'ProfilePage', 'TeamV2', 'Game'],
  dependencies: ['@supabase/supabase-js']
};

export const HOOK_USE_ADMIN_ROLE: HookDoc = {
  name: 'useAdminRole',
  category: 'Authentication',
  categoryKa: 'ავტორიზაცია',
  description: 'Checks if current user has admin privileges. Used to protect admin routes.',
  descriptionKa: 'ამოწმებს აქვს თუ არა მიმდინარე მომხმარებელს ადმინის პრივილეგიები. გამოიყენება ადმინ მარშრუტების დასაცავად.',
  filePath: 'src/hooks/useAdminRole.ts',
  returns: [
    { name: 'isAdmin', type: 'boolean', description: 'Has admin role', descriptionKa: 'აქვს ადმინის როლი' },
    { name: 'isLoading', type: 'boolean', description: 'Role check loading', descriptionKa: 'როლის შემოწმება იტვირთება' },
    { name: 'role', type: 'string | null', description: 'User role name', descriptionKa: 'მომხმარებლის როლის სახელი' },
  ],
  usedIn: ['AdminRoute', 'Admin pages'],
  dependencies: ['useAuth']
};

export const HOOK_USE_VIP_STATUS: HookDoc = {
  name: 'useVipStatus',
  category: 'Authentication',
  categoryKa: 'ავტორიზაცია',
  description: 'Checks VIP subscription status. Returns tier level and expiration.',
  descriptionKa: 'ამოწმებს VIP გამოწერის სტატუსს. აბრუნებს დონის დონეს და ვადის გასვლას.',
  filePath: 'src/hooks/useVipStatus.ts',
  returns: [
    { name: 'isVip', type: 'boolean', description: 'Has active VIP subscription', descriptionKa: 'აქვს აქტიური VIP გამოწერა' },
    { name: 'tier', type: 'string | null', description: 'VIP tier: vip, pro, elite', descriptionKa: 'VIP დონე: vip, pro, elite' },
    { name: 'expiresAt', type: 'Date | null', description: 'Subscription expiration', descriptionKa: 'გამოწერის ვადის გასვლა' },
    { name: 'isLoading', type: 'boolean', description: 'Status check loading', descriptionKa: 'სტატუსის შემოწმება იტვირთება' },
  ],
  usedIn: ['VIPPage', 'DesktopPlayButton', 'TeamProSidebar'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

// ============= GAME HOOKS =============

export const HOOK_USE_TRIVIA: HookDoc = {
  name: 'useTrivia',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Fetches trivia questions for a category/level. Handles seen question tracking.',
  descriptionKa: 'იღებს ტრივია კითხვებს კატეგორიისთვის/დონისთვის. ამუშავებს ნანახი კითხვების თვალყურის დევნებას.',
  filePath: 'src/hooks/useTrivia.ts',
  params: [
    { name: 'categoryId', type: 'string', description: 'Category to fetch from', descriptionKa: 'კატეგორია საიდანაც უნდა მოვიტანოთ' },
    { name: 'levelNumber', type: 'number', description: 'Level number (optional)', descriptionKa: 'დონის ნომერი (არასავალდებულო)' },
    { name: 'count', type: 'number', description: 'Number of questions', descriptionKa: 'კითხვების რაოდენობა' },
  ],
  returns: [
    { name: 'questions', type: 'Question[]', description: 'Fetched questions', descriptionKa: 'მიღებული კითხვები' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
    { name: 'error', type: 'Error | null', description: 'Fetch error', descriptionKa: 'მიღების შეცდომა' },
    { name: 'refetch', type: '() => void', description: 'Refetch questions', descriptionKa: 'კითხვების ხელახლა მიღება' },
  ],
  usedIn: ['CategoryQuizPage', 'Game'],
  dependencies: ['questionService', '@tanstack/react-query']
};

export const HOOK_USE_CATEGORIES: HookDoc = {
  name: 'useCategories',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Fetches all active quiz categories with translations.',
  descriptionKa: 'იღებს ყველა აქტიურ ქვიზის კატეგორიას თარგმანებით.',
  filePath: 'src/hooks/useCategories.ts',
  returns: [
    { name: 'categories', type: 'Category[]', description: 'All categories', descriptionKa: 'ყველა კატეგორია' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
    { name: 'getCategoryById', type: '(id) => Category', description: 'Find category by ID', descriptionKa: 'იპოვე კატეგორია ID-ით' },
  ],
  usedIn: ['CategoryPage', 'PlayCategoryModal', 'AdminContentManager'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_CATEGORY_PROGRESS: HookDoc = {
  name: 'useCategoryProgress',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Tracks user progress within a category. Returns completed levels and stars.',
  descriptionKa: 'თვალყურს ადევნებს მომხმარებლის პროგრესს კატეგორიის ფარგლებში. აბრუნებს დასრულებულ დონეებს და ვარსკვლავებს.',
  filePath: 'src/hooks/useCategoryProgress.ts',
  params: [
    { name: 'categoryId', type: 'string', description: 'Category to check', descriptionKa: 'კატეგორია შესამოწმებლად' },
  ],
  returns: [
    { name: 'progress', type: 'LevelProgress[]', description: 'Array of level completions', descriptionKa: 'დონეების დასრულებების მასივი' },
    { name: 'totalStars', type: 'number', description: 'Total stars earned', descriptionKa: 'მიღებული ვარსკვლავების ჯამი' },
    { name: 'highestLevel', type: 'number', description: 'Highest unlocked level', descriptionKa: 'უმაღლესი განბლოკილი დონე' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['CategoryPage', 'LevelSelector'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_MULTIPLAYER_V2: HookDoc = {
  name: 'useMultiplayerV2',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Main multiplayer game hook. Manages room state, participants, questions, and real-time sync.',
  descriptionKa: 'მთავარი მულტიპლეიერ თამაშის hook. მართავს ოთახის state-ს, მონაწილეებს, კითხვებს და რეალურ დროის სინქრონიზაციას.',
  filePath: 'src/contexts/MultiplayerContextV2.tsx',
  returns: [
    { name: 'room', type: 'GameRoom | null', description: 'Current room data', descriptionKa: 'მიმდინარე ოთახის მონაცემები' },
    { name: 'participants', type: 'Participant[]', description: 'Room participants', descriptionKa: 'ოთახის მონაწილეები' },
    { name: 'currentQuestion', type: 'Question | null', description: 'Current question', descriptionKa: 'მიმდინარე კითხვა' },
    { name: 'phase', type: 'GamePhase', description: 'Current game phase', descriptionKa: 'მიმდინარე თამაშის ფაზა' },
    { name: 'createRoom', type: '(options) => Promise', description: 'Create new room', descriptionKa: 'ახალი ოთახის შექმნა' },
    { name: 'enterRoom', type: '(code) => Promise', description: 'Join room by code', descriptionKa: 'ოთახში შესვლა კოდით' },
    { name: 'leaveRoom', type: '() => Promise', description: 'Leave current room', descriptionKa: 'მიმდინარე ოთახიდან გასვლა' },
    { name: 'startGame', type: '() => Promise', description: 'Host starts game', descriptionKa: 'ჰოსტი იწყებს თამაშს' },
    { name: 'submitAnswer', type: '(answer) => Promise', description: 'Submit answer', descriptionKa: 'პასუხის გაგზავნა' },
    { name: 'nextQuestion', type: '() => Promise', description: 'Move to next question', descriptionKa: 'გადასვლა შემდეგ კითხვაზე' },
  ],
  usedIn: ['TeamV2', 'RoomLobby', 'MultiplayerGameScreenV2', 'GameResultsScreenV2'],
  dependencies: ['@supabase/supabase-js', 'questionService']
};

// ============= SOCIAL HOOKS =============

export const HOOK_USE_FRIENDS: HookDoc = {
  name: 'useFriends',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Manages friend list, pending requests, and friend actions.',
  descriptionKa: 'მართავს მეგობრების სიას, მომლოდინე მოთხოვნებს და მეგობრების მოქმედებებს.',
  filePath: 'src/hooks/useFriends.ts',
  returns: [
    { name: 'friends', type: 'Friend[]', description: 'Accepted friends list', descriptionKa: 'მიღებული მეგობრების სია' },
    { name: 'pendingRequests', type: 'FriendRequest[]', description: 'Incoming requests', descriptionKa: 'შემომავალი მოთხოვნები' },
    { name: 'sentRequests', type: 'FriendRequest[]', description: 'Outgoing requests', descriptionKa: 'გამავალი მოთხოვნები' },
    { name: 'sendRequest', type: '(userId) => Promise', description: 'Send friend request', descriptionKa: 'მეგობრობის მოთხოვნის გაგზავნა' },
    { name: 'acceptRequest', type: '(requestId) => Promise', description: 'Accept request', descriptionKa: 'მოთხოვნის მიღება' },
    { name: 'declineRequest', type: '(requestId) => Promise', description: 'Decline request', descriptionKa: 'მოთხოვნის უარყოფა' },
    { name: 'removeFriend', type: '(userId) => Promise', description: 'Remove friend', descriptionKa: 'მეგობრის წაშლა' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['FriendsList', 'AddFriendModal', 'FriendsStoriesBar'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_CHAT: HookDoc = {
  name: 'useChat',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Direct messaging between users. Handles message sending, receiving, and read status.',
  descriptionKa: 'პირდაპირი შეტყობინებები მომხმარებლებს შორის. ამუშავებს შეტყობინების გაგზავნას, მიღებას და წაკითხვის სტატუსს.',
  filePath: 'src/hooks/useChat.ts',
  params: [
    { name: 'friendId', type: 'string', description: 'Chat partner user ID', descriptionKa: 'ჩათის პარტნიორის მომხმარებლის ID' },
  ],
  returns: [
    { name: 'messages', type: 'Message[]', description: 'Chat messages', descriptionKa: 'ჩათის შეტყობინებები' },
    { name: 'sendMessage', type: '(text) => Promise', description: 'Send message', descriptionKa: 'შეტყობინების გაგზავნა' },
    { name: 'markAsRead', type: '() => Promise', description: 'Mark messages read', descriptionKa: 'შეტყობინებების მონიშვნა წაკითხულად' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['ChatModal', 'DirectChatScreen'],
  dependencies: ['useAuth', '@supabase/supabase-js']
};

export const HOOK_USE_NOTIFICATIONS: HookDoc = {
  name: 'useNotifications',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'In-app notifications. Fetches unread count and notification list.',
  descriptionKa: 'აპლიკაციის შიდა შეტყობინებები. იღებს წაუკითხავი რაოდენობას და შეტყობინებების სიას.',
  filePath: 'src/hooks/useNotifications.ts',
  returns: [
    { name: 'notifications', type: 'Notification[]', description: 'All notifications', descriptionKa: 'ყველა შეტყობინება' },
    { name: 'unreadCount', type: 'number', description: 'Unread count', descriptionKa: 'წაუკითხავი რაოდენობა' },
    { name: 'markAsRead', type: '(id) => Promise', description: 'Mark as read', descriptionKa: 'მონიშნე წაკითხულად' },
    { name: 'markAllRead', type: '() => Promise', description: 'Mark all read', descriptionKa: 'მონიშნე ყველა წაკითხულად' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['NotificationsPage', 'DesktopLeftNav', 'UnifiedDesktopNav'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

// ============= ECONOMY HOOKS =============

export const HOOK_USE_CURRENCY: HookDoc = {
  name: 'useCurrency',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'User currency (coins and gems) with methods to add/spend.',
  descriptionKa: 'მომხმარებლის ვალუტა (მონეტები და ლალები) დამატების/ხარჯვის მეთოდებით.',
  filePath: 'src/hooks/useCurrency.ts',
  returns: [
    { name: 'coins', type: 'number', description: 'Current coin balance', descriptionKa: 'მიმდინარე მონეტების ბალანსი' },
    { name: 'gems', type: 'number', description: 'Current gem balance', descriptionKa: 'მიმდინარე ლალების ბალანსი' },
    { name: 'addCoins', type: '(amount) => Promise', description: 'Add coins', descriptionKa: 'მონეტების დამატება' },
    { name: 'spendCoins', type: '(amount) => Promise', description: 'Spend coins', descriptionKa: 'მონეტების დახარჯვა' },
    { name: 'addGems', type: '(amount) => Promise', description: 'Add gems', descriptionKa: 'ლალების დამატება' },
    { name: 'spendGems', type: '(amount) => Promise', description: 'Spend gems', descriptionKa: 'ლალების დახარჯვა' },
    { name: 'refetch', type: '() => void', description: 'Refresh balance', descriptionKa: 'ბალანსის განახლება' },
  ],
  usedIn: ['Header components', 'Shop', 'Game results'],
  dependencies: ['useAuth']
};

export const HOOK_USE_USER_POWER_UPS: HookDoc = {
  name: 'useUserPowerUps',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'User power-up inventory and usage.',
  descriptionKa: 'მომხმარებლის power-up ინვენტარი და გამოყენება.',
  filePath: 'src/hooks/useUserPowerUps.ts',
  returns: [
    { name: 'powerUps', type: 'PowerUp[]', description: 'Owned power-ups', descriptionKa: 'საკუთრებაში არსებული power-up-ები' },
    { name: 'usePowerUp', type: '(type) => Promise', description: 'Use a power-up', descriptionKa: 'power-up-ის გამოყენება' },
    { name: 'getCount', type: '(type) => number', description: 'Get count of type', descriptionKa: 'ტიპის რაოდენობის მიღება' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['PowerUps page', 'Game screens'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

// ============= ADMIN HOOKS =============

export const HOOK_USE_ADMIN_QUESTIONS: HookDoc = {
  name: 'useAdminQuestions',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Admin question management with filtering, pagination, and CRUD.',
  descriptionKa: 'ადმინის კითხვების მართვა ფილტრაციით, პაგინაციით და CRUD-ით.',
  filePath: 'src/hooks/admin/useAdminQuestions.ts',
  params: [
    { name: 'filters', type: 'QuestionFilters', description: 'Filter options', descriptionKa: 'ფილტრის ოფციები' },
    { name: 'page', type: 'number', description: 'Current page', descriptionKa: 'მიმდინარე გვერდი' },
  ],
  returns: [
    { name: 'questions', type: 'Question[]', description: 'Filtered questions', descriptionKa: 'გაფილტრული კითხვები' },
    { name: 'totalCount', type: 'number', description: 'Total matching count', descriptionKa: 'შესაბამისი ჯამური რაოდენობა' },
    { name: 'createQuestion', type: '(data) => Promise', description: 'Create question', descriptionKa: 'კითხვის შექმნა' },
    { name: 'updateQuestion', type: '(id, data) => Promise', description: 'Update question', descriptionKa: 'კითხვის განახლება' },
    { name: 'deleteQuestion', type: '(id) => Promise', description: 'Delete question', descriptionKa: 'კითხვის წაშლა' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['ContentManager', 'QuestionTools'],
  dependencies: ['useAdminRole', '@tanstack/react-query']
};

export const HOOK_USE_ICON_LIBRARY: HookDoc = {
  name: 'useIconLibrary',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Icon library management. Search, filter, and CRUD icons.',
  descriptionKa: 'ხატულას ბიბლიოთეკის მართვა. ხატულების ძებნა, ფილტრაცია და CRUD.',
  filePath: 'src/hooks/admin/useIconLibrary.ts',
  returns: [
    { name: 'icons', type: 'Icon[]', description: 'All icons', descriptionKa: 'ყველა ხატულა' },
    { name: 'searchIcons', type: '(query) => Icon[]', description: 'Search icons', descriptionKa: 'ხატულების ძებნა' },
    { name: 'getIconBySlug', type: '(slug) => Icon', description: 'Get by slug', descriptionKa: 'მიღება slug-ით' },
    { name: 'addIcon', type: '(data) => Promise', description: 'Add icon', descriptionKa: 'ხატულას დამატება' },
    { name: 'updateIcon', type: '(id, data) => Promise', description: 'Update icon', descriptionKa: 'ხატულას განახლება' },
    { name: 'deleteIcon', type: '(id) => Promise', description: 'Delete icon', descriptionKa: 'ხატულას წაშლა' },
    { name: 'isLoading', type: 'boolean', description: 'Fetch in progress', descriptionKa: 'მიღება მიმდინარეობს' },
  ],
  usedIn: ['IconLibraryAdmin', 'IconPicker', 'IconAssignment'],
  dependencies: ['@tanstack/react-query']
};

// Export all hooks
export const ALL_HOOKS: HookDoc[] = [
  HOOK_USE_AUTH,
  HOOK_USE_ADMIN_ROLE,
  HOOK_USE_VIP_STATUS,
  HOOK_USE_TRIVIA,
  HOOK_USE_CATEGORIES,
  HOOK_USE_CATEGORY_PROGRESS,
  HOOK_USE_MULTIPLAYER_V2,
  HOOK_USE_FRIENDS,
  HOOK_USE_CHAT,
  HOOK_USE_NOTIFICATIONS,
  HOOK_USE_CURRENCY,
  HOOK_USE_USER_POWER_UPS,
  HOOK_USE_ADMIN_QUESTIONS,
  HOOK_USE_ICON_LIBRARY,
];

// Hook categories for navigation
export const HOOK_CATEGORIES = [
  { id: 'authentication', name: 'Authentication', nameKa: 'ავტორიზაცია' },
  { id: 'game', name: 'Game', nameKa: 'თამაში' },
  { id: 'social', name: 'Social', nameKa: 'სოციალური' },
  { id: 'economy', name: 'Economy', nameKa: 'ეკონომიკა' },
  { id: 'admin', name: 'Admin', nameKa: 'ადმინი' },
];
