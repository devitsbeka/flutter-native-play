// Complete Hooks Documentation - ALL 104 hooks
// This file documents every single hook in the application

export interface HookDocFull {
  name: string;
  path: string;
  description: string;
  category: string;
  params?: string[];
  returns: string[];
  usedIn: string[];
}

export const ALL_HOOKS_FULL: HookDocFull[] = [
  // ============= AUTHENTICATION =============
  { name: "useAuth", path: "src/hooks/useAuth.ts", description: "Core authentication hook. Provides current user, profile, login/logout functions, and auth state.", category: "Authentication", returns: ["user", "profile", "loading", "signIn", "signUp", "signOut", "updateProfile"], usedIn: ["Throughout app"] },
  { name: "useAdminRole", path: "src/hooks/useAdminRole.ts", description: "Checks if current user has admin or moderator role.", category: "Authentication", returns: ["isAdmin", "isModerator", "loading"], usedIn: ["AdminRoute", "Admin pages"] },
  { name: "useVipStatus", path: "src/hooks/useVipStatus.ts", description: "Fetches user's VIP subscription status and expiration.", category: "Authentication", returns: ["isVip", "tier", "expiresAt", "loading"], usedIn: ["VIP pages", "Feature gates"] },

  // ============= GAME & TRIVIA =============
  { name: "useTrivia", path: "src/hooks/useTrivia.ts", description: "Main hook for fetching and managing trivia questions.", category: "Game", params: ["categoryId", "level", "count"], returns: ["questions", "loading", "error", "refetch"], usedIn: ["CategoryQuizPage", "Game"] },
  { name: "useSessionQuestions", path: "src/hooks/useSessionQuestions.ts", description: "Manages question state during active game session.", category: "Game", returns: ["currentQuestion", "questionIndex", "answers", "nextQuestion", "submitAnswer"], usedIn: ["QuizGameScreen"] },
  { name: "useQuestionAvailability", path: "src/hooks/useQuestionAvailability.ts", description: "Checks if questions are available for a category/level.", category: "Game", params: ["categoryId", "level"], returns: ["hasQuestions", "isExhausted", "totalCount", "unseenCount"], usedIn: ["LevelSelector"] },
  { name: "useGameStake", path: "src/hooks/useGameStake.ts", description: "Manages betting/stake system for matches.", category: "Game", returns: ["canPlay", "stakeAmount", "deductStake", "awardWin", "awardDraw", "awardLose"], usedIn: ["Game", "CategoryQuizPage"] },
  { name: "useDailyPlays", path: "src/hooks/useDailyPlays.ts", description: "Tracks daily play limits for free users.", category: "Game", returns: ["playsRemaining", "maxPlays", "canPlay", "usePlay", "resetTime"], usedIn: ["HomeScreen", "PlayButton"] },
  { name: "useGuestPlays", path: "src/hooks/useGuestPlays.ts", description: "Manages play limits for guest (non-registered) users.", category: "Game", returns: ["guestPlaysRemaining", "useGuestPlay", "isGuest"], usedIn: ["HomeScreen"] },
  { name: "useGuestProgress", path: "src/hooks/useGuestProgress.ts", description: "Tracks guest user progress before registration.", category: "Game", returns: ["guestProgress", "saveProgress", "clearProgress"], usedIn: ["GuestProgressBanner"] },

  // ============= CATEGORIES & PROGRESS =============
  { name: "useCategories", path: "src/hooks/useCategories.ts", description: "Fetches all quiz categories with translations.", category: "Categories", returns: ["categories", "loading", "error"], usedIn: ["HomeScreen", "CategoryGrid"] },
  { name: "useCategoryProgress", path: "src/hooks/useCategoryProgress.ts", description: "Fetches user's progress for a specific category.", category: "Categories", params: ["categoryId"], returns: ["progress", "completedLevels", "totalStars", "loading"], usedIn: ["CategoryPage"] },
  { name: "useCategoryLeaderboard", path: "src/hooks/useCategoryLeaderboard.ts", description: "Fetches leaderboard for a specific category.", category: "Categories", params: ["categoryId"], returns: ["leaderboard", "userRank", "loading"], usedIn: ["CategoryLeaderboard"] },
  { name: "useCategoryIconResolver", path: "src/hooks/useCategoryIconResolver.ts", description: "Resolves category icons from slug or URL.", category: "Categories", returns: ["getIconUrl", "loading"], usedIn: ["CategoryCard"] },
  { name: "useFavorites", path: "src/hooks/useFavorites.ts", description: "Manages user's favorite categories.", category: "Categories", returns: ["favorites", "isFavorite", "toggleFavorite", "loading"], usedIn: ["CategoryCard", "HomeScreen"] },
  { name: "useWorldProgress", path: "src/hooks/useWorldProgress.ts", description: "Tracks overall world/map completion progress.", category: "Categories", returns: ["worldProgress", "completedRegions", "loading"], usedIn: ["WorldHome"] },

  // ============= MULTIPLAYER =============
  { name: "useGameRoom", path: "src/hooks/useGameRoom.ts", description: "Main hook for multiplayer room management.", category: "Multiplayer", params: ["roomId"], returns: ["room", "participants", "status", "joinRoom", "leaveRoom", "startGame"], usedIn: ["TriviaLobby"] },
  { name: "useRoomParticipants", path: "src/hooks/useRoomParticipants.ts", description: "Real-time participant tracking for rooms.", category: "Multiplayer", params: ["roomId"], returns: ["participants", "loading"], usedIn: ["TriviaLobby"] },
  { name: "useRoomChat", path: "src/hooks/useRoomChat.ts", description: "Room chat functionality with real-time messages.", category: "Multiplayer", params: ["roomId"], returns: ["messages", "sendMessage", "loading"], usedIn: ["RoomChat"] },
  { name: "useRoomCategoryQueue", path: "src/hooks/useRoomCategoryQueue.ts", description: "Manages category queue for multiplayer rooms.", category: "Multiplayer", params: ["roomId"], returns: ["queue", "addCategory", "removeCategory", "reorder"], usedIn: ["CreateRoomModal"] },
  { name: "useRoomMatchHistory", path: "src/hooks/useRoomMatchHistory.ts", description: "Fetches match history for a room.", category: "Multiplayer", params: ["roomId"], returns: ["history", "loading"], usedIn: ["RoomStats"] },
  { name: "useMyRooms", path: "src/hooks/useMyRooms.ts", description: "Fetches rooms created or joined by current user.", category: "Multiplayer", returns: ["rooms", "loading", "refresh"], usedIn: ["TeamV2"] },
  { name: "useRecentRooms", path: "src/hooks/useRecentRooms.ts", description: "Fetches recently played rooms.", category: "Multiplayer", returns: ["recentRooms", "loading"], usedIn: ["RecentRoomsSection"] },
  { name: "useUnreadRoomMessages", path: "src/hooks/useUnreadRoomMessages.ts", description: "Tracks unread message counts per room.", category: "Multiplayer", returns: ["unreadCounts", "markAsRead"], usedIn: ["RoomList"] },
  { name: "usePendingChallenges", path: "src/hooks/usePendingChallenges.ts", description: "Fetches pending game challenges/invitations.", category: "Multiplayer", returns: ["challenges", "accept", "decline", "loading"], usedIn: ["TeamV2"] },
  { name: "useGameInvitations", path: "src/hooks/useGameInvitations.ts", description: "Manages game invitation sending and receiving.", category: "Multiplayer", returns: ["invitations", "sendInvite", "loading"], usedIn: ["FriendsList"] },

  // ============= TV MODE =============
  { name: "useTVDiscovery", path: "src/hooks/useTVDiscovery.ts", description: "Discovers and connects to TV sessions.", category: "TV", returns: ["session", "players", "connect", "disconnect"], usedIn: ["TVDisplay", "TVJoin"] },
  { name: "useTVSessionQueue", path: "src/hooks/useTVSessionQueue.ts", description: "Manages category queue for TV sessions.", category: "TV", params: ["sessionId"], returns: ["queue", "currentRound", "nextRound"], usedIn: ["TVDisplay"] },
  { name: "useExternalDisplay", path: "src/hooks/useExternalDisplay.ts", description: "Detects and manages external display connections.", category: "TV", returns: ["hasExternalDisplay", "displayInfo"], usedIn: ["PlayOnTVButton"] },
  { name: "useMapSounds", path: "src/hooks/useMapSounds.ts", description: "Manages ambient sounds for TV/map displays.", category: "TV", returns: ["playSound", "stopSound", "setVolume"], usedIn: ["TVDisplay"] },

  // ============= SOCIAL =============
  { name: "useFriends", path: "src/hooks/useFriends.ts", description: "Fetches and manages friend list.", category: "Social", returns: ["friends", "loading", "addFriend", "removeFriend"], usedIn: ["FriendsList"] },
  { name: "useFriendInvites", path: "src/hooks/useFriendInvites.ts", description: "Manages pending friend invitations.", category: "Social", returns: ["invites", "accept", "decline", "loading"], usedIn: ["FriendsPage"] },
  { name: "useFriendsWithSound", path: "src/hooks/useFriendsWithSound.ts", description: "Friends hook with notification sounds.", category: "Social", returns: ["friends", "newFriendSound"], usedIn: ["FriendsList"] },
  { name: "useChat", path: "src/hooks/useChat.ts", description: "Direct messaging between users.", category: "Social", params: ["friendId"], returns: ["messages", "sendMessage", "loading"], usedIn: ["ChatModal"] },
  { name: "useTypingIndicator", path: "src/hooks/useTypingIndicator.ts", description: "Real-time typing indicator for chats.", category: "Social", params: ["chatId"], returns: ["isTyping", "setTyping"], usedIn: ["ChatModal"] },
  { name: "useConversationPreviews", path: "src/hooks/useConversationPreviews.ts", description: "Fetches preview of recent conversations.", category: "Social", returns: ["conversations", "loading"], usedIn: ["MessagesPage"] },
  { name: "usePlayerProfile", path: "src/hooks/usePlayerProfile.ts", description: "Fetches detailed profile for any player.", category: "Social", params: ["userId"], returns: ["profile", "stats", "achievements", "loading"], usedIn: ["ProfileModal"] },
  { name: "useRecentPlayers", path: "src/hooks/useRecentPlayers.ts", description: "Fetches recently played opponents.", category: "Social", returns: ["recentPlayers", "loading"], usedIn: ["RecentPlayersList"] },
  { name: "useUserModeration", path: "src/hooks/useUserModeration.ts", description: "Block and report user functionality.", category: "Social", returns: ["blockUser", "reportUser", "isBlocked"], usedIn: ["ProfileModal"] },
  { name: "useOnlineUsers", path: "src/hooks/useOnlineUsers.ts", description: "Tracks online status of users.", category: "Social", returns: ["onlineUsers", "isOnline"], usedIn: ["FriendsList"] },
  { name: "useActiveUsers", path: "src/hooks/useActiveUsers.ts", description: "Fetches currently active users.", category: "Social", returns: ["activeUsers", "loading"], usedIn: ["AdminDashboard"] },
  { name: "useUserPresence", path: "src/hooks/useUserPresence.ts", description: "Manages current user's presence status.", category: "Social", returns: ["updatePresence", "setPage"], usedIn: ["UserPresenceTracker"] },
  { name: "useSocialFeed", path: "src/hooks/useSocialFeed.ts", description: "Fetches social feed of user-created content.", category: "Social", returns: ["posts", "loading", "loadMore"], usedIn: ["Discover"] },
  { name: "usePlayerFeedItems", path: "src/hooks/usePlayerFeedItems.ts", description: "Fetches feed items for a specific player.", category: "Social", params: ["userId"], returns: ["feedItems", "loading"], usedIn: ["ProfilePage"] },

  // ============= ECONOMY =============
  { name: "useCurrency", path: "src/hooks/useCurrency.ts", description: "Manages user's coins and gems.", category: "Economy", returns: ["coins", "gems", "addCoins", "addGems", "spendCoins", "spendGems"], usedIn: ["Throughout app"] },
  { name: "useUserPowerUps", path: "src/hooks/useUserPowerUps.ts", description: "Manages user's power-up inventory.", category: "Economy", returns: ["powerUps", "usePowerUp", "loading"], usedIn: ["PowerUpBar", "ShopPage"] },
  { name: "useRewardTimers", path: "src/hooks/useRewardTimers.ts", description: "Tracks daily and chest reward cooldowns.", category: "Economy", returns: ["canClaimDaily", "canClaimChest", "dailyTimeLeft", "chestTimeLeft"], usedIn: ["HomeScreen", "RewardsPage"] },
  { name: "useRewards", path: "src/hooks/useRewards.ts", description: "Claims and tracks various rewards.", category: "Economy", returns: ["claimDaily", "claimChest", "claimLevel"], usedIn: ["RewardModals"] },
  { name: "useEconomyConfig", path: "src/hooks/useEconomyConfig.ts", description: "Fetches dynamic economy configuration.", category: "Economy", returns: ["config", "loading"], usedIn: ["Admin", "Rewards"] },
  { name: "useGemPurchase", path: "src/hooks/useGemPurchase.ts", description: "Handles gem purchase via Stripe.", category: "Economy", returns: ["purchase", "loading", "error"], usedIn: ["ShopPage"] },
  { name: "useInAppPurchases", path: "src/hooks/useInAppPurchases.ts", description: "Handles iOS/Android in-app purchases.", category: "Economy", returns: ["products", "purchase", "restore", "loading"], usedIn: ["ShopPage", "VIPPage"] },
  { name: "usePurchaseAnalytics", path: "src/hooks/usePurchaseAnalytics.ts", description: "Tracks purchase analytics events.", category: "Economy", returns: ["trackPurchase", "trackView"], usedIn: ["ShopPage"] },

  // ============= SHOP =============
  { name: "useShopData", path: "src/hooks/useShopData.tsx", description: "Static shop product definitions.", category: "Shop", returns: ["SHOP_SECTIONS"], usedIn: ["PowerUps"] },
  { name: "useShopPageData", path: "src/hooks/useShopPageData.ts", description: "Fetches user-specific shop data.", category: "Shop", returns: ["data", "loading", "refetch"], usedIn: ["PowerUps"] },
  { name: "useShopProducts", path: "src/hooks/useShopProducts.ts", description: "Fetches available shop products.", category: "Shop", returns: ["products", "loading"], usedIn: ["ShopPage"] },
  { name: "useShopPrefetch", path: "src/hooks/useShopPrefetch.ts", description: "Prefetches shop data for navigation.", category: "Shop", returns: ["prefetchShopData", "preloadShopPage"], usedIn: ["Navigation"] },
  { name: "useAvatarFrames", path: "src/hooks/useAvatarFrames.ts", description: "Fetches and manages avatar frames.", category: "Shop", returns: ["frames", "unlockedFrames", "equipFrame"], usedIn: ["FrameShop", "Profile"] },

  // ============= LEADERBOARDS =============
  { name: "useLeagueLeaderboard", path: "src/hooks/useLeagueLeaderboard.ts", description: "Fetches weekly league rankings.", category: "Leaderboards", params: ["tier"], returns: ["leaderboard", "userRank", "loading"], usedIn: ["Leaderboards"] },
  { name: "useLeaderboardRewards", path: "src/hooks/useLeaderboardRewards.ts", description: "Fetches leaderboard reward tiers.", category: "Leaderboards", returns: ["rewards", "loading"], usedIn: ["Leaderboards"] },
  { name: "useLeaderboardPrefetch", path: "src/hooks/useLeaderboardPrefetch.ts", description: "Prefetches leaderboard data.", category: "Leaderboards", returns: ["prefetchAllTiers"], usedIn: ["Navigation"] },
  { name: "useUserCategoryRanks", path: "src/hooks/useUserCategoryRanks.ts", description: "Fetches user's rank in each category.", category: "Leaderboards", returns: ["ranks", "loading"], usedIn: ["Profile"] },
  { name: "useTotalStars", path: "src/hooks/useTotalStars.ts", description: "Fetches total stars earned across all categories.", category: "Leaderboards", returns: ["totalStars", "loading"], usedIn: ["Profile", "Leaderboards"] },
  { name: "useLevelPositions", path: "src/hooks/useLevelPositions.ts", description: "Manages level positions on adventure map.", category: "Leaderboards", returns: ["positions", "updatePosition"], usedIn: ["AdventureMapAdmin"] },

  // ============= NOTIFICATIONS =============
  { name: "useNotifications", path: "src/hooks/useNotifications.ts", description: "Fetches and manages in-app notifications.", category: "Notifications", returns: ["notifications", "unreadCount", "markAsRead", "loading"], usedIn: ["Notifications"] },
  { name: "useNotificationModal", path: "src/hooks/useNotificationModal.ts", description: "Manages notification modal display.", category: "Notifications", returns: ["showNotification", "hideNotification"], usedIn: ["App"] },
  { name: "usePushNotifications", path: "src/hooks/usePushNotifications.ts", description: "Manages push notification permissions and tokens.", category: "Notifications", returns: ["requestPermission", "token", "enabled"], usedIn: ["Settings"] },
  { name: "useGenerationNotifications", path: "src/hooks/useGenerationNotifications.ts", description: "Shows notifications for AI generation progress.", category: "Notifications", returns: ["notify", "dismiss"], usedIn: ["Admin"] },
  { name: "useNewContentIndicators", path: "src/hooks/useNewContentIndicators.ts", description: "Tracks new content badges for navigation.", category: "Notifications", returns: ["newContent", "markSeen"], usedIn: ["Navigation"] },
  { name: "useNewCategories", path: "src/hooks/useNewCategories.ts", description: "Which categories were added recently and not yet opened.", category: "Notifications", returns: ["newCategories", "isNewCategory", "loading"], usedIn: ["Discover"] },

  // ============= ADMIN =============
  { name: "useAdminCategories", path: "src/hooks/useAdminCategories.ts", description: "CRUD operations for categories.", category: "Admin", returns: ["categories", "create", "update", "delete", "loading"], usedIn: ["AdminCategories"] },
  { name: "useAdminQuestions", path: "src/hooks/useAdminQuestions.ts", description: "CRUD operations for questions.", category: "Admin", returns: ["questions", "create", "update", "delete", "loading"], usedIn: ["AdminQuestions"] },
  { name: "useAIGenerationSettings", path: "src/hooks/useAIGenerationSettings.ts", description: "Manages AI generation prompt settings.", category: "Admin", returns: ["settings", "update", "loading"], usedIn: ["AdminGenerate"] },
  { name: "useIconLibrary", path: "src/hooks/useIconLibrary.ts", description: "Fetches and manages icon library.", category: "Admin", returns: ["icons", "search", "upload", "loading"], usedIn: ["IconPicker"] },
  { name: "useIconLibrarySlugSet", path: "src/hooks/useIconLibrarySlugSet.ts", description: "Provides set of icon slugs for validation.", category: "Admin", returns: ["slugSet", "loading"], usedIn: ["QuestionEditor"] },
  { name: "useIconVerification", path: "src/hooks/useIconVerification.ts", description: "Verifies icon URLs are valid.", category: "Admin", returns: ["verify", "results", "loading"], usedIn: ["AdminIcons"] },
  { name: "useIconSuggestions", path: "src/hooks/useIconSuggestions.ts", description: "AI-powered icon suggestions for questions.", category: "Admin", returns: ["getSuggestions", "suggestions", "loading"], usedIn: ["QuestionEditor"] },
  { name: "useIconAssignmentHistory", path: "src/hooks/useIconAssignmentHistory.ts", description: "Tracks icon assignment changes.", category: "Admin", returns: ["history", "loading"], usedIn: ["IconAssignmentHistory"] },
  { name: "useIconReviewQueue", path: "src/hooks/useIconReviewQueue.ts", description: "Manages queue of icons needing review.", category: "Admin", returns: ["queue", "approve", "reject", "loading"], usedIn: ["AdminIcons"] },
  { name: "useAdminIconAssignment", path: "src/hooks/useAdminIconAssignment.ts", description: "Bulk icon assignment operations.", category: "Admin", returns: ["assign", "loading"], usedIn: ["BulkIconReassignment"] },
  { name: "useAIIcon", path: "src/hooks/useAIIcon.ts", description: "AI icon generation and search.", category: "Admin", returns: ["generateIcon", "searchIcon", "loading"], usedIn: ["IconSuggestionsPanel"] },
  { name: "useAIIconSlug", path: "src/hooks/useAIIconSlug.ts", description: "AI icon slug suggestions.", category: "Admin", returns: ["suggestSlug", "loading"], usedIn: ["QuestionEditor"] },
  { name: "useDuplicateDetection", path: "src/hooks/useDuplicateDetection.ts", description: "Detects duplicate questions.", category: "Admin", returns: ["checkDuplicate", "duplicates"], usedIn: ["QuestionEditor"] },
  { name: "useSimilarQuestions", path: "src/hooks/useSimilarQuestions.ts", description: "Finds semantically similar questions.", category: "Admin", returns: ["findSimilar", "similar", "loading"], usedIn: ["AdminQuestions"] },
  { name: "useAppSettings", path: "src/hooks/useAppSettings.ts", description: "Manages global app settings.", category: "Admin", returns: ["settings", "update", "loading"], usedIn: ["AdminSettings"] },

  // ============= CONTENT CREATION =============
  { name: "useCollections", path: "src/hooks/useCollections.ts", description: "Manages user quiz collections.", category: "Content", returns: ["collections", "create", "update", "delete"], usedIn: ["Discover", "Profile"] },
  { name: "useCollectionLobby", path: "src/hooks/useCollectionLobby.ts", description: "Manages collection lobby state.", category: "Content", params: ["collectionId"], returns: ["collection", "rounds", "loading"], usedIn: ["CollectionLobby"] },
  { name: "useDrafts", path: "src/hooks/useDrafts.ts", description: "Manages trivia draft saving.", category: "Content", returns: ["drafts", "save", "load", "delete"], usedIn: ["TriviaCreator"] },
  { name: "useTriviaDrafts", path: "src/hooks/useTriviaDrafts.ts", description: "Extended trivia draft management.", category: "Content", returns: ["drafts", "saveDraft", "loadDraft", "deleteDraft"], usedIn: ["TriviaCreator"] },
  { name: "useTriviaLobby", path: "src/hooks/useTriviaLobby.ts", description: "Manages trivia lobby before game start.", category: "Content", returns: ["lobby", "settings", "start"], usedIn: ["TriviaLobby"] },
  { name: "useExploreCreators", path: "src/hooks/useExploreCreators.ts", description: "Fetches top content creators.", category: "Content", returns: ["creators", "loading"], usedIn: ["Discover"] },
  { name: "useQuestionParser", path: "src/hooks/useQuestionParser.ts", description: "Parses questions from text input.", category: "Content", returns: ["parse", "questions", "errors"], usedIn: ["TriviaCreator"] },
  { name: "useDidYouKnow", path: "src/hooks/useDidYouKnow.ts", description: "Fetches random trivia facts.", category: "Content", returns: ["fact", "loading", "refresh"], usedIn: ["LoadingScreen"] },

  // ============= MISSIONS =============
  { name: "useMissions", path: "src/hooks/useMissions.ts", description: "Fetches and tracks daily/weekly missions.", category: "Missions", returns: ["missions", "progress", "claimReward", "loading"], usedIn: ["MissionsPage"] },
  { name: "useMissionStreak", path: "src/hooks/useMissionStreak.ts", description: "Tracks mission completion streak.", category: "Missions", returns: ["streak", "bonus", "loading"], usedIn: ["MissionsPage"] },
  { name: "useMissionAchievements", path: "src/hooks/useMissionAchievements.ts", description: "Tracks mission-related achievements.", category: "Missions", returns: ["achievements", "loading"], usedIn: ["MissionsPage"] },

  // ============= UTILITY =============
  { name: "useNetworkStatus", path: "src/hooks/useNetworkStatus.ts", description: "Tracks online/offline network status.", category: "Utility", returns: ["isOnline", "wasOffline"], usedIn: ["OfflineBanner"] },
  { name: "usePersistedState", path: "src/hooks/usePersistedState.ts", description: "useState with localStorage persistence.", category: "Utility", params: ["key", "initialValue"], returns: ["state", "setState", "clear"], usedIn: ["Throughout app"] },
  { name: "useGeoLocation", path: "src/hooks/useGeoLocation.ts", description: "Gets user's country from IP.", category: "Utility", returns: ["countryCode", "loading", "error"], usedIn: ["Registration"] },
  { name: "useCamera", path: "src/hooks/useCamera.ts", description: "Camera access for avatar photos.", category: "Utility", returns: ["takePhoto", "selectPhoto", "loading"], usedIn: ["AvatarUpload"] },
  { name: "usePingPongVideo", path: "src/hooks/usePingPongVideo.ts", description: "Manages ping-pong video playback.", category: "Utility", returns: ["play", "pause", "direction"], usedIn: ["AnimatedAvatar"] },
  { name: "useNavigationPrefetch", path: "src/hooks/useNavigationPrefetch.ts", description: "Prefetches data on nav hover.", category: "Utility", returns: ["prefetchRoute"], usedIn: ["Navigation"] },
  { name: "useExplorePrefetch", path: "src/hooks/useExplorePrefetch.ts", description: "Prefetches explore/discover data.", category: "Utility", returns: ["prefetchExploreData", "preloadExplorePage"], usedIn: ["Navigation"] },

  // ============= UI UTILITIES =============
  { name: "use-mobile", path: "src/hooks/use-mobile.tsx", description: "Detects mobile device viewport.", category: "UI", returns: ["isMobile"], usedIn: ["Throughout app"] },
  { name: "use-breakpoint", path: "src/hooks/use-breakpoint.ts", description: "Responsive breakpoint detection.", category: "UI", returns: ["breakpoint", "isMobile", "isTablet", "isDesktop"], usedIn: ["Layouts"] },
  { name: "use-toast", path: "src/hooks/use-toast.ts", description: "Toast notification hook.", category: "UI", returns: ["toast", "dismiss"], usedIn: ["Throughout app"] },
  { name: "use-clipboard", path: "src/hooks/use-clipboard.ts", description: "Clipboard copy functionality.", category: "UI", returns: ["copy", "copied"], usedIn: ["ShareButtons"] },
];

export const HOOK_CATEGORY_COUNTS = [
  { category: "Authentication", count: 3 },
  { category: "Game", count: 7 },
  { category: "Categories", count: 6 },
  { category: "Multiplayer", count: 11 },
  { category: "TV", count: 4 },
  { category: "Social", count: 14 },
  { category: "Economy", count: 10 },
  { category: "Shop", count: 5 },
  { category: "Leaderboards", count: 6 },
  { category: "Notifications", count: 6 },
  { category: "Admin", count: 15 },
  { category: "Content", count: 8 },
  { category: "Missions", count: 3 },
  { category: "Utility", count: 8 },
  { category: "UI", count: 4 },
];
