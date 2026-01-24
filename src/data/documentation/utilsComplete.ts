// Complete Utils and Lib Documentation
// Documents ALL utility functions and libraries

export interface UtilDoc {
  name: string;
  path: string;
  description: string;
  functions: UtilFunction[];
}

export interface UtilFunction {
  name: string;
  description: string;
  params?: string[];
  returns: string;
  example?: string;
}

export const UTILS_FILES: UtilDoc[] = [
  {
    name: "utils.ts",
    path: "src/lib/utils.ts",
    description: "Core utility functions used throughout the app.",
    functions: [
      { name: "cn", description: "Merges Tailwind classes with clsx and tailwind-merge.", params: ["...inputs"], returns: "string", example: "cn('base', condition && 'active')" },
      { name: "formatCompactNumber", description: "Formats numbers with K/M suffixes.", params: ["num"], returns: "string", example: "formatCompactNumber(1500) → '1.5K'" },
      { name: "formatTimeAgo", description: "Converts date to relative time string.", params: ["date"], returns: "string", example: "formatTimeAgo(date) → '5 min ago'" },
    ]
  },
  {
    name: "shuffle.ts",
    path: "src/utils/shuffle.ts",
    description: "Fisher-Yates shuffle implementation.",
    functions: [
      { name: "shuffle", description: "Randomly shuffles array elements.", params: ["array"], returns: "T[]", example: "shuffle([1,2,3,4]) → [3,1,4,2]" },
    ]
  },
  {
    name: "transliteration.ts",
    path: "src/utils/transliteration.ts",
    description: "Georgian-Latin character conversion.",
    functions: [
      { name: "transliterateToLatin", description: "Converts Georgian text to Latin.", params: ["text"], returns: "string", example: "transliterateToLatin('გამარჯობა') → 'gamarjoba'" },
      { name: "transliterateToGeorgian", description: "Converts Latin text to Georgian.", params: ["text"], returns: "string", example: "transliterateToGeorgian('gamarjoba') → 'გამარჯობა'" },
    ]
  },
  {
    name: "levelCalculation.ts",
    path: "src/utils/levelCalculation.ts",
    description: "XP and level progression calculations.",
    functions: [
      { name: "calculateLevel", description: "Calculates level from total XP.", params: ["totalXP"], returns: "LevelInfo", example: "calculateLevel(5000) → { level: 12, ... }" },
      { name: "calculateXPForLevel", description: "XP required for a level.", params: ["level"], returns: "number", example: "calculateXPForLevel(10) → 4500" },
      { name: "getStreakBonus", description: "Streak multiplier calculation.", params: ["streak"], returns: "number", example: "getStreakBonus(7) → 1.5" },
      { name: "getStreakMilestones", description: "Returns milestone days and rewards.", params: [], returns: "Milestone[]" },
    ]
  },
  {
    name: "questionValidation.ts",
    path: "src/utils/questionValidation.ts",
    description: "Question and answer validation utilities.",
    functions: [
      { name: "validateQuestionLength", description: "Checks question text length.", params: ["text"], returns: "ValidationResult" },
      { name: "validateAnswerLength", description: "Checks answer text length.", params: ["text"], returns: "ValidationResult" },
      { name: "getQuestionLengthStatus", description: "Returns status color for length.", params: ["length"], returns: "'ok' | 'warning' | 'error'" },
    ]
  },
  {
    name: "duplicateDetection.ts",
    path: "src/utils/duplicateDetection.ts",
    description: "Question similarity and duplicate detection.",
    functions: [
      { name: "detectDuplicate", description: "Finds similar existing questions.", params: ["question", "existingQuestions"], returns: "DuplicateResult" },
      { name: "calculateSimilarity", description: "Levenshtein distance similarity.", params: ["str1", "str2"], returns: "number" },
    ]
  },
  {
    name: "iconAnswerValidation.ts",
    path: "src/utils/iconAnswerValidation.ts",
    description: "Validates icon-answer matching.",
    functions: [
      { name: "validateIconAnswer", description: "Checks if icon matches answer.", params: ["iconSlug", "answer"], returns: "boolean" },
      { name: "extractKeywords", description: "Extracts keywords from answer.", params: ["answer"], returns: "string[]" },
    ]
  },
  {
    name: "roomNameGenerator.ts",
    path: "src/utils/roomNameGenerator.ts",
    description: "Generates random Georgian room names.",
    functions: [
      { name: "generateRoomName", description: "Creates random squad name.", params: [], returns: "string", example: "generateRoomName() → 'მამაცი ლომები'" },
      { name: "generateRoomCode", description: "Creates 6-char room code.", params: [], returns: "string", example: "generateRoomCode() → 'ABC123'" },
    ]
  },
  {
    name: "questionFetcher.ts",
    path: "src/utils/questionFetcher.ts",
    description: "Low-level question fetching utilities.",
    functions: [
      { name: "fetchQuestionsByCategory", description: "Fetches questions for category.", params: ["categoryId", "options"], returns: "Promise<Question[]>" },
      { name: "fetchQuestionsByLevel", description: "Fetches questions for level.", params: ["categoryId", "level"], returns: "Promise<Question[]>" },
    ]
  },
  {
    name: "tvScoring.ts",
    path: "src/utils/tvScoring.ts",
    description: "TV mode scoring calculations.",
    functions: [
      { name: "calculateTVScore", description: "Calculates points for TV answer.", params: ["correct", "timeRemaining", "streak"], returns: "number" },
      { name: "getTVRankings", description: "Sorts players by TV score.", params: ["players"], returns: "RankedPlayer[]" },
    ]
  },
  {
    name: "tvDebug.ts",
    path: "src/utils/tvDebug.ts",
    description: "TV mode debugging utilities.",
    functions: [
      { name: "logTVEvent", description: "Logs TV debug events.", params: ["event", "data"], returns: "void" },
      { name: "getTVDebugState", description: "Returns current TV state.", params: [], returns: "TVDebugState" },
    ]
  },
  {
    name: "videoFrameExtractor.ts",
    path: "src/utils/videoFrameExtractor.ts",
    description: "Extracts frames from video for avatars.",
    functions: [
      { name: "extractFrame", description: "Extracts single frame from video.", params: ["videoUrl", "time"], returns: "Promise<Blob>" },
      { name: "extractKeyFrames", description: "Extracts multiple key frames.", params: ["videoUrl", "count"], returns: "Promise<Blob[]>" },
    ]
  },
  {
    name: "notificationTranslations.ts",
    path: "src/utils/notificationTranslations.ts",
    description: "Notification text translations.",
    functions: [
      { name: "getNotificationText", description: "Gets translated notification.", params: ["type", "data", "language"], returns: "{ title: string, body: string }" },
    ]
  },
  {
    name: "logger.ts",
    path: "src/utils/logger.ts",
    description: "Structured logging utility.",
    functions: [
      { name: "log", description: "Logs info message.", params: ["message", "data"], returns: "void" },
      { name: "error", description: "Logs error message.", params: ["message", "error"], returns: "void" },
      { name: "warn", description: "Logs warning message.", params: ["message", "data"], returns: "void" },
    ]
  },
  {
    name: "cx.ts",
    path: "src/utils/cx.ts",
    description: "Simple classname helper (alternative to cn).",
    functions: [
      { name: "cx", description: "Joins class names.", params: ["...classes"], returns: "string" },
    ]
  },
  {
    name: "is-react-component.ts",
    path: "src/utils/is-react-component.ts",
    description: "Type guard for React components.",
    functions: [
      { name: "isReactComponent", description: "Checks if value is React component.", params: ["value"], returns: "boolean" },
    ]
  },
];

export const LIB_FILES: UtilDoc[] = [
  {
    name: "i18n.ts",
    path: "src/lib/i18n.ts",
    description: "Internationalization configuration and helpers.",
    functions: [
      { name: "getTranslation", description: "Gets translated string.", params: ["key", "language"], returns: "string" },
      { name: "formatDate", description: "Formats date for locale.", params: ["date", "language"], returns: "string" },
    ]
  },
  {
    name: "countryCoordinates.ts",
    path: "src/lib/countryCoordinates.ts",
    description: "Country coordinate data for map displays.",
    functions: [
      { name: "getCountryCoordinates", description: "Gets lat/lng for country.", params: ["countryCode"], returns: "{ lat: number, lng: number }" },
      { name: "COUNTRY_COORDINATES", description: "Map of all country coordinates.", params: [], returns: "Record<string, Coordinates>" },
    ]
  },
];

export const CONFIG_FILES_FULL = [
  {
    name: "economyConfig.ts",
    path: "src/config/economyConfig.ts",
    description: "Default economy values and constants.",
    exports: ["ECONOMY_DEFAULTS", "POWER_UP_COSTS", "DAILY_REWARDS", "CHEST_REWARDS", "LEVEL_UP_REWARDS"],
  },
  {
    name: "rewardConfig.ts",
    path: "src/config/rewardConfig.ts",
    description: "Game reward configuration.",
    exports: ["REWARDS", "STAKE_AMOUNT", "WIN_COINS", "DRAW_COINS", "LOSE_COINS", "XP_PER_CORRECT"],
  },
  {
    name: "leaderboardRewards.ts",
    path: "src/config/leaderboardRewards.ts",
    description: "Weekly leaderboard reward tiers.",
    exports: ["TIER_REWARDS", "RANK_REWARDS", "PROMOTION_THRESHOLDS"],
  },
  {
    name: "categoryIconMapping.ts",
    path: "src/config/categoryIconMapping.ts",
    description: "Maps category IDs to icon slugs.",
    exports: ["CATEGORY_ICONS", "getCategoryIcon"],
  },
  {
    name: "roomGradients.ts",
    path: "src/config/roomGradients.ts",
    description: "Room card gradient color definitions.",
    exports: ["ROOM_GRADIENTS", "getGradientForIndex"],
  },
  {
    name: "videoConfig.ts",
    path: "src/config/videoConfig.ts",
    description: "Background video configuration.",
    exports: ["VIDEO_SOURCES", "getVideoForCategory"],
  },
  {
    name: "notificationConfig.ts",
    path: "src/config/notificationConfig.ts",
    description: "Push notification configuration.",
    exports: ["NOTIFICATION_CHANNELS", "NOTIFICATION_SOUNDS"],
  },
];

export const CONSTANTS_FILES = [
  {
    name: "questionQuality.ts",
    path: "src/constants/questionQuality.ts",
    description: "Question quality thresholds and limits.",
    constants: [
      { name: "MAX_QUESTION_LENGTH", value: 150, description: "Maximum question text length" },
      { name: "MAX_ANSWER_LENGTH", value: 40, description: "Maximum answer text length" },
      { name: "MIN_WRONG_ANSWERS", value: 3, description: "Required wrong answers" },
      { name: "QUALITY_THRESHOLDS", value: "{ good: 80, warning: 60, bad: 0 }", description: "Quality score thresholds" },
    ],
  },
];
