export const COMPONENTS_GAME = [
  {
    name: "GameContainer",
    path: "src/components/game/GameContainer.tsx",
    description: "Main wrapper for all game modes. Handles question display, timer, power-ups, and answer submission.",
    props: ["mode", "questions", "onComplete", "categoryId"],
    usedIn: ["CategoryGame", "VSGame", "MultiplayerGame"]
  },
  {
    name: "QuestionScreen",
    path: "src/components/game/QuestionScreen.tsx",
    description: "Displays current question with 4 answer options. Handles answer selection and feedback animations.",
    props: ["question", "onAnswer", "timeRemaining", "showFeedback"],
    usedIn: ["GameContainer"]
  },
  {
    name: "AnswerButton",
    path: "src/components/game/AnswerButton.tsx",
    description: "Individual answer option button with correct/incorrect states and animations.",
    props: ["text", "isCorrect", "isSelected", "disabled", "onClick"],
    usedIn: ["QuestionScreen"]
  },
  {
    name: "TimerBadge",
    path: "src/components/game/TimerBadge.tsx",
    description: "Circular countdown timer with progress ring. Pulses red when time is low.",
    props: ["seconds", "maxSeconds", "compact"],
    usedIn: ["QuestionScreen", "GameHeader"]
  },
  {
    name: "PowerUpBar",
    path: "src/components/game/PowerUpBar.tsx",
    description: "Horizontal bar showing available power-ups during gameplay.",
    props: ["powerUps", "onUse", "disabled"],
    usedIn: ["GameContainer"]
  },
  {
    name: "PowerUpIcon",
    path: "src/components/game/PowerUpIcon.tsx",
    description: "Individual power-up button with icon, count, and locked state.",
    props: ["type", "isLocked", "isActive", "onClick", "label"],
    usedIn: ["PowerUpBar", "MyPowersBar"]
  },
  {
    name: "PowerUpBadge",
    path: "src/components/game/PowerUpBadge.tsx",
    description: "Compact power-up display with gradient background and count.",
    props: ["type", "count", "size"],
    usedIn: ["MyPowersModal", "ShopItemCard"]
  },
  {
    name: "ProgressDots",
    path: "src/components/game/ProgressDots.tsx",
    description: "Dot indicators showing question progress in a game session.",
    props: ["total", "current", "userProgress", "opponentProgress"],
    usedIn: ["GameHeader"]
  },
  {
    name: "CategoryBadge",
    path: "src/components/game/CategoryBadge.tsx",
    description: "Displays category name with mascot icon in game header.",
    props: ["category", "color"],
    usedIn: ["GameContainer", "QuestionScreen"]
  },
  {
    name: "BoardGameMap",
    path: "src/components/game/BoardGameMap.tsx",
    description: "Visual game board showing user/opponent progress with tiles.",
    props: ["currentQuestion", "totalQuestions", "userProgress", "opponentProgress", "answerHistory"],
    usedIn: ["MatchResultScreen"]
  },
  {
    name: "GameProgressBar",
    path: "src/components/game/GameProgressBar.tsx",
    description: "Horizontal progress bar with animated fill and shine effect.",
    props: ["current", "total", "label"],
    usedIn: ["LevelProgress", "XPProgress"]
  },
  {
    name: "GameWinModal",
    path: "src/components/game/GameWinModal.tsx",
    description: "Victory celebration modal with confetti, rewards, and play again button.",
    props: ["isOpen", "onClose", "onPlayAgain", "score", "coinsEarned"],
    usedIn: ["GameContainer"]
  },
  {
    name: "GameLoseModal",
    path: "src/components/game/GameLoseModal.tsx",
    description: "Loss modal with encouragement message and consolation coins.",
    props: ["isOpen", "onClose", "onPlayAgain", "userScore", "opponentScore"],
    usedIn: ["GameContainer"]
  },
  {
    name: "GameDrawModal",
    path: "src/components/game/GameDrawModal.tsx",
    description: "Draw result modal with rematch option.",
    props: ["isOpen", "onClose", "onPlayAgain", "score"],
    usedIn: ["GameContainer"]
  },
  {
    name: "MatchResultScreen",
    path: "src/components/game/MatchResultScreen.tsx",
    description: "Full match result display with board, scores, and navigation.",
    props: ["result", "userScore", "opponentScore", "answerHistory"],
    usedIn: ["VSGame", "MultiplayerGame"]
  },
  {
    name: "FeedbackButtons",
    path: "src/components/game/FeedbackButtons.tsx",
    description: "Thumbs up/down buttons for rating questions.",
    props: ["onBoring", "onFun"],
    usedIn: ["QuestionScreen"]
  },
  {
    name: "ComingSoonModal",
    path: "src/components/game/ComingSoonModal.tsx",
    description: "Modal shown when content is not yet available.",
    props: ["isOpen", "onClose", "categoryName", "levelNumber"],
    usedIn: ["CategoryLevels"]
  }
];

export const COMPONENTS_HOME = [
  {
    name: "HomeScreen",
    path: "src/components/game/HomeScreen.tsx",
    description: "Main dashboard with user stats, recent quiz, and live quizzes.",
    props: [],
    usedIn: ["Index page"]
  },
  {
    name: "CategoryCard",
    path: "src/components/home/CategoryCard.tsx",
    description: "Category selection card with icon, progress, and coin cost.",
    props: ["name", "icon", "progress", "totalLevels", "isLocked", "coinCost"],
    usedIn: ["HomeScreen", "CategoryGrid"]
  },
  {
    name: "FeaturedCard",
    path: "src/components/home/FeaturedCard.tsx",
    description: "Large featured quiz card with gradient background.",
    props: ["title", "icon", "coinCost", "questionsCount", "progress"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "LevelBadge",
    path: "src/components/home/LevelBadge.tsx",
    description: "Circular level indicator with XP progress ring.",
    props: ["totalPoints"],
    usedIn: ["HomeScreen", "ProfileHeader"]
  },
  {
    name: "LevelInfoModal",
    path: "src/components/home/LevelInfoModal.tsx",
    description: "Modal showing detailed level info, XP progress, and next rewards.",
    props: ["isOpen", "onClose", "levelInfo", "onContinue"],
    usedIn: ["LevelBadge"]
  },
  {
    name: "LevelUpModal",
    path: "src/components/home/LevelUpModal.tsx",
    description: "Celebration modal when user levels up with confetti and rewards.",
    props: ["isOpen", "onClose", "newLevel", "previousLevel"],
    usedIn: ["GameContainer"]
  },
  {
    name: "StreakModal",
    path: "src/components/home/StreakModal.tsx",
    description: "Shows current streak, best streak, and milestone progress.",
    props: ["isOpen", "onClose", "currentStreak", "bestStreak"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "PointsModal",
    path: "src/components/home/PointsModal.tsx",
    description: "XP breakdown modal showing sources of points.",
    props: ["isOpen", "onClose", "totalXP", "gamesPlayed"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "ChestRewardModal",
    path: "src/components/home/ChestRewardModal.tsx",
    description: "Daily chest reward claim modal with animations.",
    props: ["isOpen", "onClose", "onClaim"],
    usedIn: ["HomeScreen", "RewardsPage"]
  },
  {
    name: "DailyRewardModal",
    path: "src/components/home/DailyRewardModal.tsx",
    description: "Daily login reward with streak bonuses.",
    props: ["isOpen", "onClose", "onClaim", "streak"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "QuickActionsBar",
    path: "src/components/home/QuickActionsBar.tsx",
    description: "Fixed bottom bar with quick navigation buttons.",
    props: ["className"],
    usedIn: ["AppLayout"]
  },
  {
    name: "DesktopPlayButtonLarge",
    path: "src/components/home/DesktopPlayButtonLarge.tsx",
    description: "Large animated play button for desktop with plays remaining.",
    props: ["onClick", "playsRemaining", "maxPlays", "canPlay", "isVip"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "GuestProgressBanner",
    path: "src/components/home/GuestProgressBanner.tsx",
    description: "Banner prompting guest users to save their progress.",
    props: [],
    usedIn: ["HomeScreen"]
  },
  {
    name: "GuestMaxPlaysModal",
    path: "src/components/home/GuestMaxPlaysModal.tsx",
    description: "Modal shown when guest exhausts free plays.",
    props: ["isOpen", "onClose", "onRegister"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "GuestActivationFlow",
    path: "src/components/home/GuestActivationFlow.tsx",
    description: "Onboarding CTA for guest users with step preview.",
    props: [],
    usedIn: ["HomeScreen"]
  },
  {
    name: "RegisterPromptModal",
    path: "src/components/home/RegisterPromptModal.tsx",
    description: "Modal prompting registration with progress summary.",
    props: ["isOpen", "onClose", "onRegister"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "NotEnoughCoinsModal",
    path: "src/components/home/NotEnoughCoinsModal.tsx",
    description: "Modal with options to earn coins when balance is low.",
    props: ["isOpen", "onClose", "coinsNeeded", "currentCoins"],
    usedIn: ["CategoryGame", "ShopPage"]
  },
  {
    name: "SoundSettingsModal",
    path: "src/components/home/SoundSettingsModal.tsx",
    description: "Audio settings with toggles for music, SFX, vibration.",
    props: ["isOpen", "onClose"],
    usedIn: ["SettingsPage", "SideMenuDrawer"]
  },
  {
    name: "HelpModal",
    path: "src/components/home/HelpModal.tsx",
    description: "Help and support options with external links.",
    props: ["isOpen", "onClose"],
    usedIn: ["SettingsPage"]
  },
  {
    name: "PrivacyModal",
    path: "src/components/home/PrivacyModal.tsx",
    description: "Privacy settings with data export and account deletion.",
    props: ["isOpen", "onClose"],
    usedIn: ["SettingsPage"]
  },
  {
    name: "MyPowersModal",
    path: "src/components/home/MyPowersModal.tsx",
    description: "Shows user's power-up inventory with shop link.",
    props: ["isOpen", "onClose"],
    usedIn: ["HomeScreen"]
  },
  {
    name: "PowerUpTutorialModal",
    path: "src/components/home/PowerUpTutorialModal.tsx",
    description: "Tutorial explaining specific power-up functionality.",
    props: ["isOpen", "onClose", "powerUpType"],
    usedIn: ["PowerUpBar"]
  },
  {
    name: "AccountSwitcherModal",
    path: "src/components/home/AccountSwitcherModal.tsx",
    description: "Account management modal with profile view option.",
    props: ["isOpen", "onClose", "onViewProfile", "profile"],
    usedIn: ["SideMenuDrawer"]
  }
];

export const COMPONENTS_TEAM = [
  {
    name: "TeamMenuScreen",
    path: "src/components/team/TeamMenuScreen.tsx",
    description: "Main menu for team/multiplayer game creation options.",
    props: ["onClose", "onSelectCreateRoom", "onSelectRandomCategory"],
    usedIn: ["TeamPage"]
  },
  {
    name: "CreateRoomModal",
    path: "src/components/team/CreateRoomModal.tsx",
    description: "Modal for creating multiplayer rooms with settings.",
    props: ["isOpen", "onClose", "onRoomCreated"],
    usedIn: ["TeamPage"]
  },
  {
    name: "QuickPlayModal",
    path: "src/components/team/QuickPlayModal.tsx",
    description: "Quick challenge modal for friend matches.",
    props: ["open", "onClose", "friend", "onStartChallenge"],
    usedIn: ["FriendsList"]
  },
  {
    name: "TVJoinModal",
    path: "src/components/team/TVJoinModal.tsx",
    description: "Modal for entering TV game code to join.",
    props: ["open", "onOpenChange"],
    usedIn: ["TeamPage"]
  },
  {
    name: "WaitingForOpponentScreen",
    path: "src/components/team/WaitingForOpponentScreen.tsx",
    description: "Waiting screen showing other players' progress.",
    props: [],
    usedIn: ["MultiplayerGame"]
  },
  {
    name: "RecentPlayersList",
    path: "src/components/team/RecentPlayersList.tsx",
    description: "Horizontal scrollable list of recent opponents.",
    props: ["onViewAll"],
    usedIn: ["TeamPage"]
  },
  {
    name: "AllRecentPlayersModal",
    path: "src/components/team/AllRecentPlayersModal.tsx",
    description: "Full list modal of recent players with stats.",
    props: ["isOpen", "onClose"],
    usedIn: ["TeamPage"]
  },
  {
    name: "RecentRoomsSection",
    path: "src/components/team/RecentRoomsSection.tsx",
    description: "Section showing recent game rooms with rejoin option.",
    props: ["onViewAll"],
    usedIn: ["TeamPage"]
  },
  {
    name: "AllRecentRoomsModal",
    path: "src/components/team/AllRecentRoomsModal.tsx",
    description: "Full list modal of recent rooms with details.",
    props: ["isOpen", "onClose"],
    usedIn: ["TeamPage"]
  },
  {
    name: "PreRoomQueuePreview",
    path: "src/components/team/PreRoomQueuePreview.tsx",
    description: "Preview of queued rounds before room creation.",
    props: ["items", "onRemove", "onClear"],
    usedIn: ["CreateRoomModal"]
  },
  {
    name: "TeamProSidebar",
    path: "src/components/team/TeamProSidebar.tsx",
    description: "PRO subscription sidebar with tier options.",
    props: [],
    usedIn: ["TeamPage"]
  },
  {
    name: "ShopProSidebar",
    path: "src/components/shop/ShopProSidebar.tsx",
    description: "PRO promotion sidebar in shop with benefits.",
    props: [],
    usedIn: ["PowerUpsPage"]
  }
];

export const COMPONENTS_SHOP = [
  {
    name: "ShopHeader",
    path: "src/components/shop/ShopHeader.tsx",
    description: "Shop page header with currency display and help button.",
    props: ["onHelpClick", "onCurrencyPlusClick"],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "ShopCurrencyBar",
    path: "src/components/shop/ShopCurrencyBar.tsx",
    description: "Compact currency display bar for shop.",
    props: [],
    usedIn: ["ShopHeader"]
  },
  {
    name: "ShopTabBar",
    path: "src/components/shop/ShopTabBar.tsx",
    description: "Tab navigation for shop sections.",
    props: ["activeTab", "onTabChange"],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "ShopProductGrid",
    path: "src/components/shop/ShopProductGrid.tsx",
    description: "Grid display of shop items with purchase status.",
    props: ["title", "items", "userGems", "purchasedItems", "onItemClick"],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "ShopItemCard",
    path: "src/components/shop/ShopItemCard.tsx",
    description: "Individual shop item card with price and purchase button.",
    props: ["item", "isPurchased", "canAfford", "onPurchase"],
    usedIn: ["ShopProductGrid"]
  },
  {
    name: "ShopBundleCard",
    path: "src/components/shop/ShopBundleCard.tsx",
    description: "Large bundle promotion card with multiple items.",
    props: ["title", "subtitle", "items", "price", "originalPrice"],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "ShopPowerUpGuide",
    path: "src/components/shop/ShopPowerUpGuide.tsx",
    description: "Educational guide explaining power-up functions.",
    props: [],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "MyPowersBar",
    path: "src/components/shop/MyPowersBar.tsx",
    description: "Horizontal bar showing owned power-ups.",
    props: ["onPowerClick"],
    usedIn: ["PowerUpsPage"]
  },
  {
    name: "CurrencyActionModal",
    path: "src/components/shop/CurrencyActionModal.tsx",
    description: "Modal for currency buy/exchange options.",
    props: ["isOpen", "onClose", "currencyType", "onBuyClick", "onExchangeClick"],
    usedIn: ["ShopHeader"]
  }
];

export const COMPONENTS_SOCIAL = [
  {
    name: "FriendsList",
    path: "src/components/social/FriendsList.tsx",
    description: "List of friends with online status and challenge buttons.",
    props: ["onChallenge", "onChat"],
    usedIn: ["SocialPage"]
  },
  {
    name: "FriendCard",
    path: "src/components/social/FriendCard.tsx",
    description: "Individual friend card with avatar and actions.",
    props: ["friend", "onChallenge", "onChat", "onViewProfile"],
    usedIn: ["FriendsList"]
  },
  {
    name: "ChatModal",
    path: "src/components/social/ChatModal.tsx",
    description: "Direct messaging modal with real-time updates.",
    props: ["isOpen", "onClose", "friend"],
    usedIn: ["SocialPage"]
  },
  {
    name: "LiveBadge",
    path: "src/components/social/LiveBadge.tsx",
    description: "Animated 'LIVE' indicator badge.",
    props: [],
    usedIn: ["RoomCard", "GameHeader"]
  },
  {
    name: "FilterBar",
    path: "src/components/social/FilterBar.tsx",
    description: "Filter controls for social content discovery.",
    props: ["onSavedOnlyChange", "popularityFilter", "hashtags"],
    usedIn: ["DiscoverPage"]
  },
  {
    name: "CollectionPreviewModal",
    path: "src/components/social/CollectionPreviewModal.tsx",
    description: "Preview modal for user collections with play option.",
    props: ["isOpen", "posts", "onPlay", "onLike", "onSave"],
    usedIn: ["DiscoverPage"]
  }
];

export const COMPONENTS_SHARED = [
  {
    name: "Avatar",
    path: "src/components/ui/avatar.tsx",
    description: "User avatar with frame support and fallback initials.",
    props: ["src", "alt", "fallback", "frame"],
    usedIn: ["Throughout app"]
  },
  {
    name: "SmartAvatar",
    path: "src/components/shared/SmartAvatar.tsx",
    description: "Avatar with click-to-view profile functionality.",
    props: ["userId", "src", "nickname", "frame"],
    usedIn: ["Throughout app"]
  },
  {
    name: "FlagIcon",
    path: "src/components/shared/FlagIcon.tsx",
    description: "Country flag icon from circle-flags library.",
    props: ["countryCode", "size"],
    usedIn: ["Leaderboards", "Profile"]
  },
  {
    name: "TimeIcon",
    path: "src/components/shared/TimeIcon.tsx",
    description: "Clock icon with gradient background.",
    props: ["size", "disabled"],
    usedIn: ["TimerBadge"]
  },
  {
    name: "CurrencyDisplay",
    path: "src/components/shared/CurrencyDisplay.tsx",
    description: "Animated coins/gems display with icons.",
    props: ["showCoins", "showGems", "size"],
    usedIn: ["Headers", "Modals"]
  },
  {
    name: "StatCard",
    path: "src/components/shared/StatCard.tsx",
    description: "Statistics display card with icon and value.",
    props: ["icon", "label", "value", "variant"],
    usedIn: ["Profile", "Results"]
  },
  {
    name: "QuizCard",
    path: "src/components/shared/QuizCard.tsx",
    description: "Reusable quiz selection card with multiple variants.",
    props: ["icon", "title", "subtitle", "questionsCount", "variant"],
    usedIn: ["HomeScreen", "CategoryList"]
  },
  {
    name: "TabBar",
    path: "src/components/shared/TabBar.tsx",
    description: "Generic tab navigation with active state.",
    props: ["tabs", "activeTab", "onTabChange"],
    usedIn: ["Multiple pages"]
  },
  {
    name: "HexBadge",
    path: "src/components/shared/HexBadge.tsx",
    description: "Hexagonal badge for achievements with lock state.",
    props: ["icon", "color", "locked", "size"],
    usedIn: ["Achievements", "Profile"]
  },
  {
    name: "PodiumDisplay",
    path: "src/components/shared/PodiumDisplay.tsx",
    description: "Top 3 players podium visualization.",
    props: ["players"],
    usedIn: ["Leaderboards"]
  },
  {
    name: "PageTransition",
    path: "src/components/shared/PageTransition.tsx",
    description: "Animated page enter/exit transitions.",
    props: ["children"],
    usedIn: ["All pages"]
  },
  {
    name: "OfflineBanner",
    path: "src/components/shared/OfflineBanner.tsx",
    description: "Banner shown when network connection is lost.",
    props: [],
    usedIn: ["App root"]
  }
];

export const COMPONENTS_TV = [
  {
    name: "TVQuestionScreen",
    path: "src/components/tv/TVQuestionScreen.tsx",
    description: "Large format question display for TV screens.",
    props: ["question", "timeRemaining", "showAnswer"],
    usedIn: ["TVGame"]
  },
  {
    name: "TVLeaderboardPanel",
    path: "src/components/tv/TVLeaderboardPanel.tsx",
    description: "Live scoreboard panel for TV mode.",
    props: ["players", "currentQuestion"],
    usedIn: ["TVGame"]
  },
  {
    name: "TVPairingScreen",
    path: "src/components/tv/TVPairingScreen.tsx",
    description: "QR code display for mobile device pairing.",
    props: ["roomCode", "players"],
    usedIn: ["TVGame"]
  },
  {
    name: "TVCountdownScreen",
    path: "src/components/tv/TVCountdownScreen.tsx",
    description: "Pre-game countdown with player list.",
    props: ["countdown", "players"],
    usedIn: ["TVGame"]
  },
  {
    name: "TVCategoryPicker",
    path: "src/components/tv/TVCategoryPicker.tsx",
    description: "Category selection for TV mode games.",
    props: ["categories", "onSelect"],
    usedIn: ["TVGame"]
  },
  {
    name: "TVResultsScreen",
    path: "src/components/tv/TVResultsScreen.tsx",
    description: "Final results display for TV with podium.",
    props: ["players", "onPlayAgain"],
    usedIn: ["TVGame"]
  }
];

export const COMPONENTS_ADMIN = [
  {
    name: "AdminRoute",
    path: "src/components/admin/AdminRoute.tsx",
    description: "Protected route wrapper requiring admin role.",
    props: ["children"],
    usedIn: ["Admin pages"]
  },
  {
    name: "AdminLayout",
    path: "src/components/admin/AdminLayout.tsx",
    description: "Admin panel layout with sidebar navigation.",
    props: ["children"],
    usedIn: ["Admin pages"]
  },
  {
    name: "IconPicker",
    path: "src/components/admin/IconPicker.tsx",
    description: "Icon selection modal with search and categories.",
    props: ["isOpen", "onClose", "onSelect", "currentIcon"],
    usedIn: ["QuestionEditor"]
  },
  {
    name: "QuestionPreviewMockup",
    path: "src/components/admin/QuestionPreviewMockup.tsx",
    description: "Preview of how question will appear in game.",
    props: ["question", "answers", "icon"],
    usedIn: ["QuestionEditor"]
  },
  {
    name: "GenerationHistoryTable",
    path: "src/components/admin/GenerationHistoryTable.tsx",
    description: "Table of AI trivia generation history.",
    props: ["history", "onRegenerate"],
    usedIn: ["AdminGeneratePage"]
  },
  {
    name: "CategoryEditor",
    path: "src/components/admin/CategoryEditor.tsx",
    description: "Form for creating/editing categories.",
    props: ["category", "onSave", "onCancel"],
    usedIn: ["AdminCategoriesPage"]
  },
  {
    name: "QuestionEditor",
    path: "src/components/admin/QuestionEditor.tsx",
    description: "Full question editing form with all fields.",
    props: ["question", "onSave", "onDelete"],
    usedIn: ["AdminQuestionsPage"]
  },
  {
    name: "BulkActionsBar",
    path: "src/components/admin/BulkActionsBar.tsx",
    description: "Bulk action controls for selected items.",
    props: ["selectedCount", "onDelete", "onMove", "onAssignIcon"],
    usedIn: ["AdminQuestionsPage"]
  }
];

export const ALL_COMPONENTS = {
  game: COMPONENTS_GAME,
  home: COMPONENTS_HOME,
  team: COMPONENTS_TEAM,
  shop: COMPONENTS_SHOP,
  social: COMPONENTS_SOCIAL,
  shared: COMPONENTS_SHARED,
  tv: COMPONENTS_TV,
  admin: COMPONENTS_ADMIN
};
