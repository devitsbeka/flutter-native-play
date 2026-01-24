export const UTILITIES = [
  {
    name: "cn",
    path: "src/lib/utils.ts",
    description: "Tailwind class name merge utility combining clsx and tailwind-merge.",
    usage: "cn('base-class', condition && 'conditional-class', className)",
    usedIn: ["All components"]
  },
  {
    name: "formatCompactNumber",
    path: "src/lib/utils.ts",
    description: "Formats large numbers with K/M suffixes (e.g., 1500 → 1.5K).",
    usage: "formatCompactNumber(1500000) → '1.5M'",
    usedIn: ["Currency displays", "Statistics"]
  },
  {
    name: "formatTimeAgo",
    path: "src/lib/utils.ts",
    description: "Converts timestamps to relative time strings.",
    usage: "formatTimeAgo(date) → '5 minutes ago'",
    usedIn: ["Chat", "Notifications"]
  },
  {
    name: "shuffle",
    path: "src/lib/shuffle.ts",
    description: "Fisher-Yates shuffle algorithm for randomizing arrays.",
    usage: "shuffle([1, 2, 3, 4]) → [3, 1, 4, 2]",
    usedIn: ["Question ordering", "Answer randomization"]
  },
  {
    name: "transliterateToLatin",
    path: "src/lib/transliteration.ts",
    description: "Converts Georgian text to Latin characters for search/display.",
    usage: "transliterateToLatin('საქართველო') → 'sakartvelo'",
    usedIn: ["Search", "Room codes"]
  },
  {
    name: "transliterateToGeorgian",
    path: "src/lib/transliteration.ts",
    description: "Converts Latin text to Georgian characters.",
    usage: "transliterateToGeorgian('gamarjoba') → 'გამარჯობა'",
    usedIn: ["Input fields"]
  },
  {
    name: "calculateLevel",
    path: "src/lib/levelCalculation.ts",
    description: "Calculates player level from total XP using progression curve.",
    usage: "calculateLevel(5000) → { level: 12, xpForNext: 450, ... }",
    usedIn: ["LevelBadge", "Profile"]
  },
  {
    name: "calculateXPForLevel",
    path: "src/lib/levelCalculation.ts",
    description: "Returns XP required to reach a specific level.",
    usage: "calculateXPForLevel(10) → 4500",
    usedIn: ["Level progress calculations"]
  },
  {
    name: "getStreakBonus",
    path: "src/lib/levelCalculation.ts",
    description: "Calculates XP bonus multiplier for daily streaks.",
    usage: "getStreakBonus(7) → 1.5",
    usedIn: ["Reward calculations"]
  },
  {
    name: "validateQuestionLength",
    path: "src/lib/questionValidation.ts",
    description: "Checks if question text is within acceptable length limits.",
    usage: "validateQuestionLength(text) → { valid: true, length: 85 }",
    usedIn: ["Question editor", "AI generation"]
  },
  {
    name: "validateAnswerLength",
    path: "src/lib/questionValidation.ts",
    description: "Checks if answer text is within acceptable length limits.",
    usage: "validateAnswerLength(text) → { valid: false, tooLong: true }",
    usedIn: ["Question editor", "AI generation"]
  },
  {
    name: "detectDuplicateQuestion",
    path: "src/lib/duplicateDetection.ts",
    description: "Compares question text for similarity using Levenshtein distance.",
    usage: "detectDuplicateQuestion(newQ, existingQuestions) → { isDuplicate: true, match: ... }",
    usedIn: ["AI generation", "Import"]
  },
  {
    name: "generateRoomCode",
    path: "src/lib/roomUtils.ts",
    description: "Generates unique 6-character room codes.",
    usage: "generateRoomCode() → 'ABC123'",
    usedIn: ["Room creation"]
  },
  {
    name: "parseQuestionFromText",
    path: "src/lib/questionParser.ts",
    description: "Extracts question and answers from formatted text.",
    usage: "parseQuestionFromText(text) → { question, answers, correct }",
    usedIn: ["Manual question input", "Paste import"]
  },
  {
    name: "sanitizeHtml",
    path: "src/lib/sanitize.ts",
    description: "Removes potentially harmful HTML from user input.",
    usage: "sanitizeHtml(userInput) → cleanText",
    usedIn: ["Chat", "User content"]
  },
  {
    name: "debounce",
    path: "src/lib/debounce.ts",
    description: "Delays function execution until after wait period.",
    usage: "debounce(fn, 300)",
    usedIn: ["Search inputs", "Auto-save"]
  },
  {
    name: "throttle",
    path: "src/lib/throttle.ts",
    description: "Limits function execution to once per interval.",
    usage: "throttle(fn, 1000)",
    usedIn: ["Scroll handlers", "Real-time updates"]
  }
];

export const CONSTANTS = [
  {
    name: "REWARDS",
    path: "src/config/rewardConfig.ts",
    description: "Game reward values for wins, draws, losses, and streaks.",
    values: {
      WIN_COINS: 50,
      DRAW_COINS: 25,
      LOSE_COINS: 10,
      STAKE_AMOUNT: 20,
      STREAK_BONUS_MULTIPLIER: 0.1
    }
  },
  {
    name: "POWER_UP_TYPES",
    path: "src/types/powerups.ts",
    description: "Available power-up type identifiers.",
    values: ["double", "bomb", "skip", "magic"]
  },
  {
    name: "GAME_MODES",
    path: "src/types/game.ts",
    description: "Game mode identifiers.",
    values: ["category", "vs", "multiplayer", "tv"]
  },
  {
    name: "QUESTION_TIME_LIMIT",
    path: "src/config/gameConfig.ts",
    description: "Default time limit per question in seconds.",
    values: { default: 20, hard: 15, easy: 30 }
  },
  {
    name: "QUESTIONS_PER_LEVEL",
    path: "src/config/gameConfig.ts",
    description: "Number of questions in a level-based game.",
    values: 5
  },
  {
    name: "QUESTIONS_PER_VS",
    path: "src/config/gameConfig.ts",
    description: "Number of questions in VS mode matches.",
    values: 10
  },
  {
    name: "MAX_QUESTION_LENGTH",
    path: "src/config/questionConfig.ts",
    description: "Maximum character limit for question text.",
    values: 150
  },
  {
    name: "MAX_ANSWER_LENGTH",
    path: "src/config/questionConfig.ts",
    description: "Maximum character limit for answer text.",
    values: 40
  },
  {
    name: "LEAGUE_TIERS",
    path: "src/config/leaderboardConfig.ts",
    description: "Weekly league tier definitions.",
    values: ["bronze", "silver", "gold", "platinum", "diamond", "master", "legend"]
  },
  {
    name: "VIP_TIERS",
    path: "src/config/vipConfig.ts",
    description: "VIP subscription tier definitions with benefits.",
    values: ["basic", "pro", "ultimate"]
  },
  {
    name: "ECONOMY_CONFIG",
    path: "src/config/economyConfig.ts",
    description: "Dynamic economy values loaded from database.",
    values: {
      dailyRewardBase: 100,
      chestRewardBase: 50,
      levelUpBonus: 200,
      streakMilestones: [3, 7, 14, 30]
    }
  },
  {
    name: "SUPPORTED_LANGUAGES",
    path: "src/config/languageConfig.ts",
    description: "Supported application languages.",
    values: ["ka", "en"]
  },
  {
    name: "AVATAR_FRAME_TIERS",
    path: "src/config/frameConfig.ts",
    description: "Avatar frame rarity tiers.",
    values: ["common", "rare", "epic", "legendary"]
  }
];

export const TYPE_DEFINITIONS = [
  {
    name: "Question",
    path: "src/types/question.ts",
    description: "Core question data structure.",
    properties: [
      "id: string",
      "question_text: string",
      "correct_answer: string",
      "wrong_answers: string[]",
      "category_id: string",
      "level_number: number",
      "difficulty: 'easy' | 'medium' | 'hard'",
      "language: 'ka' | 'en'",
      "icon_url?: string"
    ]
  },
  {
    name: "GameSession",
    path: "src/types/game.ts",
    description: "Active game session state.",
    properties: [
      "id: string",
      "mode: GameMode",
      "questions: Question[]",
      "currentIndex: number",
      "score: number",
      "timeRemaining: number",
      "answers: AnswerRecord[]"
    ]
  },
  {
    name: "Profile",
    path: "src/types/profile.ts",
    description: "User profile data structure.",
    properties: [
      "id: string",
      "nickname: string",
      "avatar_url?: string",
      "country_code?: string",
      "coins: number",
      "gems: number",
      "total_xp: number",
      "current_streak: number"
    ]
  },
  {
    name: "PowerUp",
    path: "src/types/powerups.ts",
    description: "Power-up inventory item.",
    properties: [
      "type: PowerUpType",
      "count: number",
      "lastUsed?: Date"
    ]
  },
  {
    name: "GameRoom",
    path: "src/types/multiplayer.ts",
    description: "Multiplayer room data structure.",
    properties: [
      "id: string",
      "code: string",
      "host_id: string",
      "status: 'waiting' | 'playing' | 'finished'",
      "participants: Participant[]",
      "settings: RoomSettings"
    ]
  },
  {
    name: "LeaderboardEntry",
    path: "src/types/leaderboard.ts",
    description: "Leaderboard ranking entry.",
    properties: [
      "rank: number",
      "userId: string",
      "nickname: string",
      "avatar_url?: string",
      "score: number",
      "country_code?: string"
    ]
  },
  {
    name: "Achievement",
    path: "src/types/achievements.ts",
    description: "User achievement record.",
    properties: [
      "id: string",
      "name: string",
      "description: string",
      "icon: string",
      "unlockedAt?: Date",
      "progress: number",
      "target: number"
    ]
  },
  {
    name: "Notification",
    path: "src/types/notifications.ts",
    description: "In-app notification data.",
    properties: [
      "id: string",
      "type: NotificationType",
      "title: string",
      "body: string",
      "data?: Record<string, any>",
      "read: boolean",
      "createdAt: Date"
    ]
  }
];
