// Complete Hooks Documentation
// Documents ALL React hooks used in the application

import { HookDoc, HookParam, HookReturn } from './hooks';

// ============= GAME HOOKS (Additional) =============

export const HOOK_USE_SESSION_QUESTIONS: HookDoc = {
  name: 'useSessionQuestions',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Manages question state during an active game session. Tracks current question, answers given.',
  descriptionKa: 'მართავს კითხვის state-ს აქტიური თამაშის სესიის დროს. თვალყურს ადევნებს მიმდინარე კითხვას, მოცემულ პასუხებს.',
  filePath: 'src/hooks/useSessionQuestions.ts',
  returns: [
    { name: 'currentQuestion', type: 'Question', description: 'Active question', descriptionKa: 'აქტიური კითხვა' },
    { name: 'questionIndex', type: 'number', description: 'Current index', descriptionKa: 'მიმდინარე ინდექსი' },
    { name: 'answers', type: 'Answer[]', description: 'Answers given', descriptionKa: 'მოცემული პასუხები' },
    { name: 'nextQuestion', type: '() => void', description: 'Move to next', descriptionKa: 'გადადი შემდეგზე' },
    { name: 'submitAnswer', type: '(answer) => void', description: 'Submit answer', descriptionKa: 'პასუხის გაგზავნა' },
  ],
  usedIn: ['CategoryQuizPage', 'Game'],
  dependencies: ['useTrivia']
};

export const HOOK_USE_QUESTION_AVAILABILITY: HookDoc = {
  name: 'useQuestionAvailability',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Checks if questions are available for a category/level. Handles exhaustion detection.',
  descriptionKa: 'ამოწმებს ხელმისაწვდომია თუ არა კითხვები კატეგორიისთვის/დონისთვის. ამუშავებს ამოწურვის დეტექციას.',
  filePath: 'src/hooks/useQuestionAvailability.ts',
  params: [
    { name: 'categoryId', type: 'string', description: 'Category to check', descriptionKa: 'შესამოწმებელი კატეგორია' },
    { name: 'level', type: 'number', description: 'Level number', descriptionKa: 'დონის ნომერი' },
  ],
  returns: [
    { name: 'hasQuestions', type: 'boolean', description: 'Questions available', descriptionKa: 'კითხვები ხელმისაწვდომია' },
    { name: 'isExhausted', type: 'boolean', description: 'All seen', descriptionKa: 'ყველა ნანახია' },
    { name: 'totalCount', type: 'number', description: 'Total questions', descriptionKa: 'კითხვების ჯამი' },
    { name: 'unseenCount', type: 'number', description: 'Unseen count', descriptionKa: 'ნაუნახავი რაოდენობა' },
  ],
  usedIn: ['LevelSelector', 'CategoryPage'],
  dependencies: ['questionTracker']
};

export const HOOK_USE_DAILY_PLAYS: HookDoc = {
  name: 'useDailyPlays',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Tracks daily VS game plays for free-to-play limits.',
  descriptionKa: 'თვალყურს ადევნებს ყოველდღიური VS თამაშის თამაშებს უფასო თამაშის ლიმიტებისთვის.',
  filePath: 'src/hooks/useDailyPlays.ts',
  returns: [
    { name: 'playsRemaining', type: 'number', description: 'Plays left today', descriptionKa: 'დღეს დარჩენილი თამაშები' },
    { name: 'maxPlays', type: 'number', description: 'Max daily plays', descriptionKa: 'მაქსიმალური ყოველდღიური თამაშები' },
    { name: 'canPlay', type: 'boolean', description: 'Can play now', descriptionKa: 'შეუძლია ახლა თამაში' },
    { name: 'usePlay', type: '() => Promise', description: 'Consume a play', descriptionKa: 'მოხმარე თამაში' },
    { name: 'addExtraPlay', type: '() => Promise', description: 'Add bonus play', descriptionKa: 'დაამატე ბონუს თამაში' },
  ],
  usedIn: ['DesktopPlayButton', 'VSMatchmaking'],
  dependencies: ['useAuth', 'useVipStatus']
};

export const HOOK_USE_GUEST_PLAYS: HookDoc = {
  name: 'useGuestPlays',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Manages play limits for non-authenticated guest users.',
  descriptionKa: 'მართავს თამაშის ლიმიტებს არაავტორიზებული სტუმარი მომხმარებლებისთვის.',
  filePath: 'src/hooks/useGuestPlays.ts',
  returns: [
    { name: 'guestPlaysUsed', type: 'number', description: 'Plays used', descriptionKa: 'გამოყენებული თამაშები' },
    { name: 'guestPlaysLimit', type: 'number', description: 'Guest limit', descriptionKa: 'სტუმრის ლიმიტი' },
    { name: 'canPlayAsGuest', type: 'boolean', description: 'Can play', descriptionKa: 'შეუძლია თამაში' },
    { name: 'consumeGuestPlay', type: '() => void', description: 'Use a play', descriptionKa: 'გამოიყენე თამაში' },
  ],
  usedIn: ['Index'],
  dependencies: []
};

export const HOOK_USE_LEVEL_POSITIONS: HookDoc = {
  name: 'useLevelPositions',
  category: 'Game',
  categoryKa: 'თამაში',
  description: 'Fetches level position data for game map visualization.',
  descriptionKa: 'იღებს დონის პოზიციის მონაცემებს თამაშის რუკის ვიზუალიზაციისთვის.',
  filePath: 'src/hooks/useLevelPositions.ts',
  returns: [
    { name: 'positions', type: 'LevelPosition[]', description: 'Level positions', descriptionKa: 'დონეების პოზიციები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['GameMapPage'],
  dependencies: ['@tanstack/react-query']
};

// ============= SOCIAL HOOKS (Additional) =============

export const HOOK_USE_TYPING_INDICATOR: HookDoc = {
  name: 'useTypingIndicator',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Real-time typing indicator for chat. Shows when other user is typing.',
  descriptionKa: 'რეალურ დროში აკრეფის ინდიკატორი ჩათისთვის. აჩვენებს როცა სხვა მომხმარებელი აკრეფს.',
  filePath: 'src/hooks/useTypingIndicator.ts',
  params: [
    { name: 'chatId', type: 'string', description: 'Chat/room ID', descriptionKa: 'ჩათის/ოთახის ID' },
  ],
  returns: [
    { name: 'isTyping', type: 'boolean', description: 'Other user typing', descriptionKa: 'სხვა მომხმარებელი აკრეფს' },
    { name: 'startTyping', type: '() => void', description: 'Emit typing start', descriptionKa: 'გამოსცემ აკრეფის დაწყებას' },
    { name: 'stopTyping', type: '() => void', description: 'Emit typing stop', descriptionKa: 'გამოსცემ აკრეფის შეჩერებას' },
  ],
  usedIn: ['ChatModal', 'DirectChatScreen'],
  dependencies: ['@supabase/supabase-js']
};

export const HOOK_USE_CONVERSATION_PREVIEWS: HookDoc = {
  name: 'useConversationPreviews',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Fetches chat conversation previews with last message and unread count.',
  descriptionKa: 'იღებს ჩათის საუბრების გადახედვებს ბოლო შეტყობინებით და წაუკითხავი რაოდენობით.',
  filePath: 'src/hooks/useConversationPreviews.ts',
  returns: [
    { name: 'conversations', type: 'ConversationPreview[]', description: 'All conversations', descriptionKa: 'ყველა საუბარი' },
    { name: 'unreadTotal', type: 'number', description: 'Total unread', descriptionKa: 'ჯამი წაუკითხავი' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['MessagesPage', 'ChatList'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_PENDING_CHALLENGES: HookDoc = {
  name: 'usePendingChallenges',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Fetches incoming game challenges that need response.',
  descriptionKa: 'იღებს შემომავალ თამაშის გამოწვევებს, რომლებიც საჭიროებს პასუხს.',
  filePath: 'src/hooks/usePendingChallenges.ts',
  returns: [
    { name: 'challenges', type: 'Challenge[]', description: 'Pending challenges', descriptionKa: 'მომლოდინე გამოწვევები' },
    { name: 'count', type: 'number', description: 'Challenge count', descriptionKa: 'გამოწვევების რაოდენობა' },
    { name: 'acceptChallenge', type: '(id) => Promise', description: 'Accept challenge', descriptionKa: 'მიიღე გამოწვევა' },
    { name: 'declineChallenge', type: '(id) => Promise', description: 'Decline challenge', descriptionKa: 'უარყავი გამოწვევა' },
  ],
  usedIn: ['TeamV2', 'NotificationsPage'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_GAME_INVITATIONS: HookDoc = {
  name: 'useGameInvitations',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Manages game room invitations - sending and receiving.',
  descriptionKa: 'მართავს თამაშის ოთახის მოწვევებს - გაგზავნას და მიღებას.',
  filePath: 'src/hooks/useGameInvitations.ts',
  returns: [
    { name: 'invitations', type: 'GameInvitation[]', description: 'Pending invitations', descriptionKa: 'მომლოდინე მოწვევები' },
    { name: 'sendInvitation', type: '(userId, roomId) => Promise', description: 'Send invite', descriptionKa: 'გაგზავნე მოწვევა' },
    { name: 'respondToInvitation', type: '(id, accept) => Promise', description: 'Respond to invite', descriptionKa: 'უპასუხე მოწვევას' },
  ],
  usedIn: ['FriendsList', 'InviteModal'],
  dependencies: ['useAuth']
};

export const HOOK_USE_FRIEND_INVITES: HookDoc = {
  name: 'useFriendInvites',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Manages friend request invitations.',
  descriptionKa: 'მართავს მეგობრობის მოთხოვნის მოწვევებს.',
  filePath: 'src/hooks/useFriendInvites.ts',
  returns: [
    { name: 'invites', type: 'FriendInvite[]', description: 'Pending friend requests', descriptionKa: 'მომლოდინე მეგობრობის მოთხოვნები' },
    { name: 'sendInvite', type: '(userId) => Promise', description: 'Send request', descriptionKa: 'გაგზავნე მოთხოვნა' },
    { name: 'acceptInvite', type: '(id) => Promise', description: 'Accept request', descriptionKa: 'მიიღე მოთხოვნა' },
    { name: 'declineInvite', type: '(id) => Promise', description: 'Decline request', descriptionKa: 'უარყავი მოთხოვნა' },
  ],
  usedIn: ['AddFriendModal', 'NotificationsPage'],
  dependencies: ['useAuth']
};

export const HOOK_USE_UNREAD_ROOM_MESSAGES: HookDoc = {
  name: 'useUnreadRoomMessages',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Tracks unread message counts for game rooms.',
  descriptionKa: 'თვალყურს ადევნებს წაუკითხავი შეტყობინებების რაოდენობას თამაშის ოთახებისთვის.',
  filePath: 'src/hooks/useUnreadRoomMessages.ts',
  returns: [
    { name: 'unreadByRoom', type: 'Record<string, number>', description: 'Unread counts by room', descriptionKa: 'წაუკითხავი რაოდენობა ოთახების მიხედვით' },
    { name: 'totalUnread', type: 'number', description: 'Total unread', descriptionKa: 'ჯამი წაუკითხავი' },
    { name: 'markRoomRead', type: '(roomId) => void', description: 'Mark room read', descriptionKa: 'მონიშნე ოთახი წაკითხულად' },
  ],
  usedIn: ['MyRoomsSection', 'RoomListItem'],
  dependencies: ['useAuth']
};

export const HOOK_USE_SOCIAL_FEED: HookDoc = {
  name: 'useSocialFeed',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Fetches and manages the social feed of user-created quizzes.',
  descriptionKa: 'იღებს და მართავს მომხმარებლის მიერ შექმნილი ქვიზების სოციალურ ფიდს.',
  filePath: 'src/hooks/useSocialFeed.ts',
  returns: [
    { name: 'posts', type: 'QuizPost[]', description: 'Feed posts', descriptionKa: 'ფიდის პოსტები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
    { name: 'loadMore', type: '() => Promise', description: 'Load more posts', descriptionKa: 'მეტი პოსტების ჩატვირთვა' },
    { name: 'likePost', type: '(id) => Promise', description: 'Like a post', descriptionKa: 'მოიწონე პოსტი' },
    { name: 'savePost', type: '(id) => Promise', description: 'Save a post', descriptionKa: 'შეინახე პოსტი' },
  ],
  usedIn: ['DiscoverPage', 'FeedTab'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

// ============= ECONOMY HOOKS (Additional) =============

export const HOOK_USE_ECONOMY_CONFIG: HookDoc = {
  name: 'useEconomyConfig',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Fetches dynamic economy configuration values from database.',
  descriptionKa: 'იღებს დინამიური ეკონომიკის კონფიგურაციის მნიშვნელობებს მონაცემთა ბაზიდან.',
  filePath: 'src/hooks/useEconomyConfig.ts',
  returns: [
    { name: 'config', type: 'EconomyConfig', description: 'Economy values', descriptionKa: 'ეკონომიკის მნიშვნელობები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['rewardConfig', 'Game'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_GEM_PURCHASE: HookDoc = {
  name: 'useGemPurchase',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Handles Stripe checkout flow for gem purchases.',
  descriptionKa: 'ამუშავებს Stripe checkout ნაკადს ლალების შესაძენად.',
  filePath: 'src/hooks/useGemPurchase.ts',
  returns: [
    { name: 'purchaseGems', type: '(productId) => Promise', description: 'Initiate purchase', descriptionKa: 'დაიწყე შესყიდვა' },
    { name: 'isProcessing', type: 'boolean', description: 'Payment in progress', descriptionKa: 'გადახდა მიმდინარეობს' },
  ],
  usedIn: ['GemShop', 'PowerUpsPage'],
  dependencies: ['useAuth']
};

export const HOOK_USE_IN_APP_PURCHASES: HookDoc = {
  name: 'useInAppPurchases',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Manages iOS/Android in-app purchases via RevenueCat.',
  descriptionKa: 'მართავს iOS/Android აპლიკაციის შიდა შესყიდვებს RevenueCat-ით.',
  filePath: 'src/hooks/useInAppPurchases.ts',
  returns: [
    { name: 'products', type: 'IAPProduct[]', description: 'Available products', descriptionKa: 'ხელმისაწვდომი პროდუქტები' },
    { name: 'purchase', type: '(productId) => Promise', description: 'Make purchase', descriptionKa: 'გააკეთე შესყიდვა' },
    { name: 'restore', type: '() => Promise', description: 'Restore purchases', descriptionKa: 'აღადგინე შესყიდვები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['VIPPage', 'AdFreeModal'],
  dependencies: ['@revenuecat/purchases-capacitor']
};

export const HOOK_USE_LEADERBOARD_REWARDS: HookDoc = {
  name: 'useLeaderboardRewards',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Fetches reward tiers for weekly leaderboard rankings.',
  descriptionKa: 'იღებს ჯილდოს დონეებს ყოველკვირეული ლიდერბორდის რეიტინგებისთვის.',
  filePath: 'src/hooks/useLeaderboardRewards.ts',
  returns: [
    { name: 'rewards', type: 'RewardTier[]', description: 'Reward tiers', descriptionKa: 'ჯილდოს დონეები' },
    { name: 'userReward', type: 'RewardTier | null', description: 'User\'s current tier', descriptionKa: 'მომხმარებლის მიმდინარე დონე' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['Leaderboards', 'LeagueRewardsModal'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_SHOP_PRODUCTS: HookDoc = {
  name: 'useShopProducts',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Fetches available products from the in-game shop.',
  descriptionKa: 'იღებს ხელმისაწვდომ პროდუქტებს თამაშში მაღაზიიდან.',
  filePath: 'src/hooks/useShopProducts.ts',
  returns: [
    { name: 'products', type: 'ShopProduct[]', description: 'Available products', descriptionKa: 'ხელმისაწვდომი პროდუქტები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['PowerUpsPage'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_REWARDS: HookDoc = {
  name: 'useRewards',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Manages reward claiming and history.',
  descriptionKa: 'მართავს ჯილდოს მოთხოვნას და ისტორიას.',
  filePath: 'src/hooks/useRewards.ts',
  returns: [
    { name: 'claimReward', type: '(type) => Promise', description: 'Claim reward', descriptionKa: 'მოითხოვე ჯილდო' },
    { name: 'rewardHistory', type: 'Reward[]', description: 'Past rewards', descriptionKa: 'წარსული ჯილდოები' },
  ],
  usedIn: ['RewardsPage', 'DailyRewardsModal'],
  dependencies: ['useAuth', 'useCurrency']
};

// ============= MULTIPLAYER HOOKS (Additional) =============

export const HOOK_USE_GAME_ROOM: HookDoc = {
  name: 'useGameRoom',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Low-level room management. Create, join, leave rooms.',
  descriptionKa: 'დაბალი დონის ოთახის მართვა. შექმნა, შეერთება, დატოვება.',
  filePath: 'src/hooks/useGameRoom.ts',
  returns: [
    { name: 'createRoom', type: '(options) => Promise<Room>', description: 'Create new room', descriptionKa: 'შექმენი ახალი ოთახი' },
    { name: 'joinRoom', type: '(code) => Promise<Room>', description: 'Join by code', descriptionKa: 'შეუერთდი კოდით' },
    { name: 'leaveRoom', type: '(roomId) => Promise', description: 'Leave room', descriptionKa: 'დატოვე ოთახი' },
    { name: 'deleteRoom', type: '(roomId) => Promise', description: 'Delete room', descriptionKa: 'წაშალე ოთახი' },
  ],
  usedIn: ['TeamV2', 'CreateRoomScreen'],
  dependencies: ['useAuth']
};

export const HOOK_USE_ROOM_PARTICIPANTS: HookDoc = {
  name: 'useRoomParticipants',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Real-time participant list for a game room.',
  descriptionKa: 'რეალურ დროში მონაწილეთა სია თამაშის ოთახისთვის.',
  filePath: 'src/hooks/useRoomParticipants.ts',
  params: [
    { name: 'roomId', type: 'string', description: 'Room to watch', descriptionKa: 'ოთახი სათვალყურებლად' },
  ],
  returns: [
    { name: 'participants', type: 'Participant[]', description: 'Room participants', descriptionKa: 'ოთახის მონაწილეები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['RoomLobby', 'ParticipantList'],
  dependencies: ['@supabase/supabase-js']
};

export const HOOK_USE_ROOM_CATEGORY_QUEUE: HookDoc = {
  name: 'useRoomCategoryQueue',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Manages the category queue for a game room.',
  descriptionKa: 'მართავს კატეგორიების რიგს თამაშის ოთახისთვის.',
  filePath: 'src/hooks/useRoomCategoryQueue.ts',
  params: [
    { name: 'roomId', type: 'string', description: 'Room ID', descriptionKa: 'ოთახის ID' },
  ],
  returns: [
    { name: 'queue', type: 'QueueItem[]', description: 'Category queue', descriptionKa: 'კატეგორიების რიგი' },
    { name: 'addToQueue', type: '(item) => Promise', description: 'Add category', descriptionKa: 'დაამატე კატეგორია' },
    { name: 'removeFromQueue', type: '(id) => Promise', description: 'Remove item', descriptionKa: 'წაშალე ელემენტი' },
    { name: 'clearQueue', type: '() => Promise', description: 'Clear queue', descriptionKa: 'გაასუფთავე რიგი' },
  ],
  usedIn: ['PreRoomQueuePreview', 'RoomCategorySelector'],
  dependencies: ['@supabase/supabase-js']
};

export const HOOK_USE_MY_ROOMS: HookDoc = {
  name: 'useMyRooms',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Fetches rooms the user has created or joined.',
  descriptionKa: 'იღებს ოთახებს, რომლებიც მომხმარებელმა შექმნა ან შეუერთდა.',
  filePath: 'src/hooks/useMyRooms.ts',
  returns: [
    { name: 'rooms', type: 'GameRoom[]', description: 'User\'s rooms', descriptionKa: 'მომხმარებლის ოთახები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['MyRoomsSection', 'TeamV2'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_RECENT_ROOMS: HookDoc = {
  name: 'useRecentRooms',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Fetches recently played game rooms.',
  descriptionKa: 'იღებს ახლახან ნათამაშებ თამაშის ოთახებს.',
  filePath: 'src/hooks/useRecentRooms.ts',
  returns: [
    { name: 'rooms', type: 'RecentRoom[]', description: 'Recent rooms', descriptionKa: 'ბოლო ოთახები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['RecentRoomsSection', 'AllRecentRoomsModal'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_ROOM_MATCH_HISTORY: HookDoc = {
  name: 'useRoomMatchHistory',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Fetches match history for a specific room.',
  descriptionKa: 'იღებს მატჩის ისტორიას კონკრეტული ოთახისთვის.',
  filePath: 'src/hooks/useRoomMatchHistory.ts',
  params: [
    { name: 'roomId', type: 'string', description: 'Room ID', descriptionKa: 'ოთახის ID' },
  ],
  returns: [
    { name: 'history', type: 'MatchHistory[]', description: 'Match history', descriptionKa: 'მატჩის ისტორია' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['RoomHistoryTab'],
  dependencies: ['@tanstack/react-query']
};

// ============= ADMIN HOOKS =============

export const HOOK_USE_ADMIN_CATEGORIES: HookDoc = {
  name: 'useAdminCategories',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Admin CRUD operations for quiz categories.',
  descriptionKa: 'ადმინის CRUD ოპერაციები ქვიზის კატეგორიებისთვის.',
  filePath: 'src/hooks/useAdminCategories.ts',
  returns: [
    { name: 'categories', type: 'Category[]', description: 'All categories', descriptionKa: 'ყველა კატეგორია' },
    { name: 'createCategory', type: '(data) => Promise', description: 'Create category', descriptionKa: 'შექმენი კატეგორია' },
    { name: 'updateCategory', type: '(id, data) => Promise', description: 'Update category', descriptionKa: 'განაახლე კატეგორია' },
    { name: 'deleteCategory', type: '(id) => Promise', description: 'Delete category', descriptionKa: 'წაშალე კატეგორია' },
  ],
  usedIn: ['AdminCategoriesPage'],
  dependencies: ['useAdminRole']
};

export const HOOK_USE_ADMIN_QUESTIONS: HookDoc = {
  name: 'useAdminQuestions',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Admin CRUD operations for trivia questions.',
  descriptionKa: 'ადმინის CRUD ოპერაციები ტრივია კითხვებისთვის.',
  filePath: 'src/hooks/useAdminQuestions.ts',
  returns: [
    { name: 'questions', type: 'Question[]', description: 'Questions', descriptionKa: 'კითხვები' },
    { name: 'createQuestion', type: '(data) => Promise', description: 'Create question', descriptionKa: 'შექმენი კითხვა' },
    { name: 'updateQuestion', type: '(id, data) => Promise', description: 'Update question', descriptionKa: 'განაახლე კითხვა' },
    { name: 'deleteQuestion', type: '(id) => Promise', description: 'Delete question', descriptionKa: 'წაშალე კითხვა' },
    { name: 'bulkUpdate', type: '(ids, data) => Promise', description: 'Bulk update', descriptionKa: 'მასობრივი განახლება' },
  ],
  usedIn: ['AdminQuestionsPage', 'ContentManager'],
  dependencies: ['useAdminRole']
};

export const HOOK_USE_ICON_LIBRARY: HookDoc = {
  name: 'useIconLibrary',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Manages the icon library. Search, filter, and update icons.',
  descriptionKa: 'მართავს ხატულების ბიბლიოთეკას. ძიება, ფილტრაცია და ხატულების განახლება.',
  filePath: 'src/hooks/useIconLibrary.ts',
  returns: [
    { name: 'icons', type: 'Icon[]', description: 'Icons', descriptionKa: 'ხატულები' },
    { name: 'search', type: '(query) => Promise', description: 'Search icons', descriptionKa: 'მოძებნე ხატულები' },
    { name: 'getBySlug', type: '(slug) => Icon', description: 'Get by slug', descriptionKa: 'მიიღე slug-ით' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['IconPicker', 'IconAssignment'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_ICON_VERIFICATION: HookDoc = {
  name: 'useIconVerification',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Verifies icon URLs and detects broken references.',
  descriptionKa: 'ამოწმებს ხატულების URL-ებს და ადგენს გატეხილ რეფერენსებს.',
  filePath: 'src/hooks/useIconVerification.ts',
  returns: [
    { name: 'verify', type: '() => Promise', description: 'Run verification', descriptionKa: 'გაუშვი ვერიფიკაცია' },
    { name: 'results', type: 'VerificationResult[]', description: 'Results', descriptionKa: 'შედეგები' },
    { name: 'brokenCount', type: 'number', description: 'Broken count', descriptionKa: 'გატეხილი რაოდენობა' },
    { name: 'isRunning', type: 'boolean', description: 'Running state', descriptionKa: 'გაშვების სტატუსი' },
  ],
  usedIn: ['FixIcons'],
  dependencies: ['verify-icons']
};

export const HOOK_USE_AI_GENERATION_SETTINGS: HookDoc = {
  name: 'useAIGenerationSettings',
  category: 'Admin',
  categoryKa: 'ადმინი',
  description: 'Manages AI prompt settings for generation.',
  descriptionKa: 'მართავს AI პრომფტის პარამეტრებს გენერაციისთვის.',
  filePath: 'src/hooks/useAIGenerationSettings.ts',
  returns: [
    { name: 'settings', type: 'AISettings[]', description: 'Settings', descriptionKa: 'პარამეტრები' },
    { name: 'updateSetting', type: '(id, data) => Promise', description: 'Update setting', descriptionKa: 'განაახლე პარამეტრი' },
    { name: 'getActive', type: '(type) => AISetting', description: 'Get active setting', descriptionKa: 'მიიღე აქტიური პარამეტრი' },
  ],
  usedIn: ['AdminAISettings'],
  dependencies: ['useAdminRole', '@tanstack/react-query']
};

// ============= TV HOOKS =============

export const HOOK_USE_TV_DISCOVERY: HookDoc = {
  name: 'useTVDiscovery',
  category: 'TV',
  categoryKa: 'TV',
  description: 'Discovers available TV sessions to join.',
  descriptionKa: 'აღმოაჩენს ხელმისაწვდომ TV სესიებს შესაერთებლად.',
  filePath: 'src/hooks/useTVDiscovery.ts',
  returns: [
    { name: 'sessions', type: 'TVSession[]', description: 'Available sessions', descriptionKa: 'ხელმისაწვდომი სესიები' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['TVJoinModal'],
  dependencies: ['@tanstack/react-query']
};

export const HOOK_USE_TV_SESSION_QUEUE: HookDoc = {
  name: 'useTVSessionQueue',
  category: 'TV',
  categoryKa: 'TV',
  description: 'Manages category queue for TV sessions.',
  descriptionKa: 'მართავს კატეგორიების რიგს TV სესიებისთვის.',
  filePath: 'src/hooks/useTVSessionQueue.ts',
  params: [
    { name: 'sessionId', type: 'string', description: 'Session ID', descriptionKa: 'სესიის ID' },
  ],
  returns: [
    { name: 'queue', type: 'QueueItem[]', description: 'Category queue', descriptionKa: 'კატეგორიების რიგი' },
    { name: 'addToQueue', type: '(category) => Promise', description: 'Add to queue', descriptionKa: 'დაამატე რიგში' },
    { name: 'removeFromQueue', type: '(id) => Promise', description: 'Remove from queue', descriptionKa: 'წაშალე რიგიდან' },
  ],
  usedIn: ['TVHostController'],
  dependencies: ['@supabase/supabase-js']
};

export const HOOK_USE_EXTERNAL_DISPLAY: HookDoc = {
  name: 'useExternalDisplay',
  category: 'TV',
  categoryKa: 'TV',
  description: 'Detects and connects to external displays for TV mode.',
  descriptionKa: 'ადგენს და უკავშირდება გარე დისპლეებს TV რეჟიმისთვის.',
  filePath: 'src/hooks/useExternalDisplay.ts',
  returns: [
    { name: 'hasExternalDisplay', type: 'boolean', description: 'External display available', descriptionKa: 'გარე დისპლეი ხელმისაწვდომია' },
    { name: 'presentationWindow', type: 'Window | null', description: 'Presentation window', descriptionKa: 'პრეზენტაციის ფანჯარა' },
    { name: 'openPresentation', type: '() => void', description: 'Open presentation', descriptionKa: 'გახსენი პრეზენტაცია' },
  ],
  usedIn: ['TVDisplay'],
  dependencies: []
};

// ============= UTILITY HOOKS =============

export const HOOK_USE_CAMERA: HookDoc = {
  name: 'useCamera',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Camera access for avatar photos using Capacitor.',
  descriptionKa: 'კამერის წვდომა ავატარის ფოტოებისთვის Capacitor-ის გამოყენებით.',
  filePath: 'src/hooks/useCamera.ts',
  returns: [
    { name: 'takePhoto', type: '() => Promise<string>', description: 'Take photo', descriptionKa: 'გადაიღე ფოტო' },
    { name: 'pickImage', type: '() => Promise<string>', description: 'Pick from gallery', descriptionKa: 'აირჩიე გალერეადან' },
    { name: 'isAvailable', type: 'boolean', description: 'Camera available', descriptionKa: 'კამერა ხელმისაწვდომია' },
  ],
  usedIn: ['AvatarUpload', 'ProfilePage'],
  dependencies: ['@capacitor/camera']
};

export const HOOK_USE_AVATAR_FRAMES: HookDoc = {
  name: 'useAvatarFrames',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Manages unlocked avatar frames and equipped frame.',
  descriptionKa: 'მართავს განბლოკილ ავატარის ჩარჩოებს და აღჭურვილ ჩარჩოს.',
  filePath: 'src/hooks/useAvatarFrames.ts',
  returns: [
    { name: 'frames', type: 'Frame[]', description: 'Unlocked frames', descriptionKa: 'განბლოკილი ჩარჩოები' },
    { name: 'equippedFrame', type: 'string | null', description: 'Currently equipped', descriptionKa: 'ამჟამად აღჭურვილი' },
    { name: 'equipFrame', type: '(id) => Promise', description: 'Equip frame', descriptionKa: 'აღჭურვე ჩარჩო' },
    { name: 'unlockFrame', type: '(id) => Promise', description: 'Unlock frame', descriptionKa: 'განბლოკე ჩარჩო' },
  ],
  usedIn: ['FrameShop', 'ProfilePage'],
  dependencies: ['useAuth']
};

export const HOOK_USE_PUSH_NOTIFICATIONS: HookDoc = {
  name: 'usePushNotifications',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Registers and manages push notification tokens.',
  descriptionKa: 'რეგისტრირებს და მართავს push შეტყობინებების ტოკენებს.',
  filePath: 'src/hooks/usePushNotifications.ts',
  returns: [
    { name: 'requestPermission', type: '() => Promise', description: 'Request permission', descriptionKa: 'მოთხოვე ნებართვა' },
    { name: 'registerToken', type: '() => Promise', description: 'Register token', descriptionKa: 'დაარეგისტრირე ტოკენი' },
    { name: 'hasPermission', type: 'boolean', description: 'Has permission', descriptionKa: 'აქვს ნებართვა' },
  ],
  usedIn: ['App', 'SettingsPage'],
  dependencies: ['@capacitor/push-notifications']
};

export const HOOK_USE_MISSIONS: HookDoc = {
  name: 'useMissions',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Fetches and manages daily/weekly missions.',
  descriptionKa: 'იღებს და მართავს ყოველდღიურ/ყოველკვირეულ მისიებს.',
  filePath: 'src/hooks/useMissions.ts',
  returns: [
    { name: 'missions', type: 'Mission[]', description: 'Active missions', descriptionKa: 'აქტიური მისიები' },
    { name: 'completeMission', type: '(id) => Promise', description: 'Complete mission', descriptionKa: 'დაასრულე მისია' },
    { name: 'claimReward', type: '(id) => Promise', description: 'Claim reward', descriptionKa: 'მოითხოვე ჯილდო' },
    { name: 'isLoading', type: 'boolean', description: 'Loading state', descriptionKa: 'ჩატვირთვის სტატუსი' },
  ],
  usedIn: ['MissionsPage'],
  dependencies: ['useAuth', '@tanstack/react-query']
};

export const HOOK_USE_FAVORITES: HookDoc = {
  name: 'useFavorites',
  category: 'Utility',
  categoryKa: 'უტილიტა',
  description: 'Manages favorite categories for quick access.',
  descriptionKa: 'მართავს ფავორიტ კატეგორიებს სწრაფი წვდომისთვის.',
  filePath: 'src/hooks/useFavorites.ts',
  returns: [
    { name: 'favorites', type: 'Set<string>', description: 'Favorite category IDs', descriptionKa: 'ფავორიტი კატეგორიების ID-ები' },
    { name: 'toggleFavorite', type: '(id) => Promise', description: 'Toggle favorite', descriptionKa: 'გადართე ფავორიტი' },
    { name: 'isFavorite', type: '(id) => boolean', description: 'Check if favorite', descriptionKa: 'შეამოწმე არის თუ არა ფავორიტი' },
  ],
  usedIn: ['CategoryPage', 'FavoritesTab'],
  dependencies: ['useAuth']
};

// Export all additional hooks
export const ALL_HOOKS_COMPLETE = [
  HOOK_USE_SESSION_QUESTIONS,
  HOOK_USE_QUESTION_AVAILABILITY,
  HOOK_USE_DAILY_PLAYS,
  HOOK_USE_GUEST_PLAYS,
  HOOK_USE_LEVEL_POSITIONS,
  HOOK_USE_TYPING_INDICATOR,
  HOOK_USE_CONVERSATION_PREVIEWS,
  HOOK_USE_PENDING_CHALLENGES,
  HOOK_USE_GAME_INVITATIONS,
  HOOK_USE_FRIEND_INVITES,
  HOOK_USE_UNREAD_ROOM_MESSAGES,
  HOOK_USE_SOCIAL_FEED,
  HOOK_USE_ECONOMY_CONFIG,
  HOOK_USE_GEM_PURCHASE,
  HOOK_USE_IN_APP_PURCHASES,
  HOOK_USE_LEADERBOARD_REWARDS,
  HOOK_USE_SHOP_PRODUCTS,
  HOOK_USE_REWARDS,
  HOOK_USE_GAME_ROOM,
  HOOK_USE_ROOM_PARTICIPANTS,
  HOOK_USE_ROOM_CATEGORY_QUEUE,
  HOOK_USE_MY_ROOMS,
  HOOK_USE_RECENT_ROOMS,
  HOOK_USE_ROOM_MATCH_HISTORY,
  HOOK_USE_ADMIN_CATEGORIES,
  HOOK_USE_ADMIN_QUESTIONS,
  HOOK_USE_ICON_LIBRARY,
  HOOK_USE_ICON_VERIFICATION,
  HOOK_USE_AI_GENERATION_SETTINGS,
  HOOK_USE_TV_DISCOVERY,
  HOOK_USE_TV_SESSION_QUEUE,
  HOOK_USE_EXTERNAL_DISPLAY,
  HOOK_USE_CAMERA,
  HOOK_USE_AVATAR_FRAMES,
  HOOK_USE_PUSH_NOTIFICATIONS,
  HOOK_USE_MISSIONS,
  HOOK_USE_FAVORITES,
];

// Hook categories (complete)
export const HOOK_CATEGORIES_COMPLETE = [
  { id: 'authentication', name: 'Authentication', nameKa: 'ავტორიზაცია', count: 3 },
  { id: 'game', name: 'Game', nameKa: 'თამაში', count: 8 },
  { id: 'social', name: 'Social', nameKa: 'სოციალური', count: 10 },
  { id: 'economy', name: 'Economy', nameKa: 'ეკონომიკა', count: 8 },
  { id: 'multiplayer', name: 'Multiplayer', nameKa: 'მულტიპლეიერი', count: 7 },
  { id: 'admin', name: 'Admin', nameKa: 'ადმინი', count: 5 },
  { id: 'tv', name: 'TV', nameKa: 'TV', count: 3 },
  { id: 'utility', name: 'Utility', nameKa: 'უტილიტა', count: 6 },
];
