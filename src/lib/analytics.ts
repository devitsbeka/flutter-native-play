import posthog from "posthog-js";
import {
  fbTrackCompleteRegistration,
  fbTrackLogin,
  fbTrackPurchase,
  fbTrackStartTrial,
  fbTrackViewContent,
  fbTrackPvpGameStarted,
  fbTrackPvpGameFinished,
  fbTrackQuizAbandoned,
  fbTrackPowerUpUsed,
  fbTrackCategoryViewed,
  fbTrackLevelSelected,
} from "./fbpixel";

// ─── AUTH EVENTS ─────────────────────────────────────────

export function trackSignupCompleted(
  method: "email" | "username" | "google" | "apple",
  hasReferral: boolean = false
) {
  posthog.capture("signup_completed", {
    method,
    has_referral: hasReferral,
    referrer: document.referrer,
  });
  fbTrackCompleteRegistration(method);
}

export function trackLoginCompleted(
  method: "email" | "username" | "google" | "apple"
) {
  posthog.capture("login_completed", { method });
  fbTrackLogin(method);
}

export function trackAuthFailed(method: string, errorMessage: string) {
  posthog.capture("auth_failed", {
    method,
    error_message: errorMessage,
  });
}

export function trackOAuthInitiated(provider: "google" | "apple") {
  posthog.capture("oauth_initiated", { provider });
}

// ─── PVP GAME EVENTS (GameContext) ───────────────────────

export function trackPvpGameStarted(
  categoryId: string,
  questionCount: number,
  opponentName: string
) {
  posthog.capture("pvp_game_started", {
    category_id: categoryId,
    question_count: questionCount,
    opponent_name: opponentName,
  });
  fbTrackPvpGameStarted(categoryId, opponentName);
}

export function trackPvpQuestionAnswered(params: {
  categoryId: string;
  questionIndex: number;
  isCorrect: boolean;
  points: number;
  streak: number;
  timeRemaining: number;
  timePerQuestion: number;
  difficulty: string;
}) {
  posthog.capture("pvp_question_answered", {
    category_id: params.categoryId,
    question_number: params.questionIndex + 1,
    is_correct: params.isCorrect,
    points: params.points,
    streak: params.streak,
    time_remaining: params.timeRemaining,
    time_per_question: params.timePerQuestion,
    difficulty: params.difficulty,
  });
}

export function trackPvpGameFinished(params: {
  categoryId: string;
  userScore: number;
  opponentScore: number;
  totalQuestions: number;
  correctAnswers: number;
  streak: number;
}) {
  const won = params.userScore > params.opponentScore;
  const result = won
    ? "win"
    : params.userScore === params.opponentScore
      ? "tie"
      : "loss";
  posthog.capture("pvp_game_finished", {
    category_id: params.categoryId,
    user_score: params.userScore,
    opponent_score: params.opponentScore,
    total_questions: params.totalQuestions,
    correct_answers: params.correctAnswers,
    score_percentage: Math.round(
      (params.correctAnswers / params.totalQuestions) * 100
    ),
    result,
    streak: params.streak,
  });
  fbTrackPvpGameFinished(result, params.userScore);
}

// ─── CATEGORY QUIZ EVENTS (CategoryQuizPage) ────────────

export function trackQuizStarted(
  categoryId: string,
  levelNumber: number,
  questionCount: number
) {
  posthog.capture("quiz_started", {
    category_id: categoryId,
    level_number: levelNumber,
    question_count: questionCount,
  });
  fbTrackStartTrial(categoryId);
}

export function trackQuizQuestionAnswered(params: {
  categoryId: string;
  levelNumber: number;
  questionIndex: number;
  isCorrect: boolean;
  timeRemaining: number;
  difficulty: string;
  usedPowerUp: boolean;
  powerUpType?: string | null;
}) {
  posthog.capture("quiz_question_answered", {
    category_id: params.categoryId,
    level_number: params.levelNumber,
    question_number: params.questionIndex + 1,
    is_correct: params.isCorrect,
    time_remaining: params.timeRemaining,
    difficulty: params.difficulty,
    used_power_up: params.usedPowerUp,
    power_up_type: params.powerUpType ?? null,
  });
}

export function trackQuizCompleted(params: {
  categoryId: string;
  levelNumber: number;
  score: number;
  totalQuestions: number;
  stars: number;
  pointsEarned: number;
  unlockedNextLevel: boolean;
}) {
  posthog.capture("quiz_completed", {
    category_id: params.categoryId,
    level_number: params.levelNumber,
    score: params.score,
    total_questions: params.totalQuestions,
    score_percentage: Math.round(
      (params.score / params.totalQuestions) * 100
    ),
    stars: params.stars,
    points_earned: params.pointsEarned,
    unlocked_next_level: params.unlockedNextLevel,
    passed: params.stars >= 1,
  });
  fbTrackViewContent(params.categoryId, params.score);
}

export function trackQuizAbandoned(
  categoryId: string,
  levelNumber: number,
  questionsAnswered: number,
  totalQuestions: number
) {
  posthog.capture("quiz_abandoned", {
    category_id: categoryId,
    level_number: levelNumber,
    questions_answered: questionsAnswered,
    total_questions: totalQuestions,
  });
  fbTrackQuizAbandoned(categoryId, levelNumber);
}

// ─── POWER-UP EVENTS ────────────────────────────────────

export function trackPowerUpUsed(
  powerUpType: string,
  context: "pvp" | "quiz",
  categoryId: string
) {
  posthog.capture("power_up_used", {
    power_up_type: powerUpType,
    context,
    category_id: categoryId,
  });
  fbTrackPowerUpUsed(powerUpType, context);
}

export function trackPowerUpPurchased(params: {
  powerUpType: string;
  quantity: number;
  currency: "coins" | "gems";
  price: number;
  isBundle: boolean;
}) {
  posthog.capture("power_up_purchased", {
    power_up_type: params.powerUpType,
    quantity: params.quantity,
    currency: params.currency,
    price: params.price,
    is_bundle: params.isBundle,
  });
  fbTrackPurchase(params.price, params.currency, params.powerUpType);
}

// ─── VIP / MONETIZATION ─────────────────────────────────

export function trackVipPurchased(
  duration: number,
  price: number,
  currency: "gems" | "lari"
) {
  posthog.capture("vip_purchased", {
    duration_days: duration,
    price,
    currency,
  });
  fbTrackPurchase(price, currency, "vip");
}

export function trackShopItemPurchased(params: {
  itemId: string;
  productType: string;
  currency: "gems" | "coins" | "lari";
  price: number;
}) {
  posthog.capture("shop_item_purchased", {
    item_id: params.itemId,
    product_type: params.productType,
    currency: params.currency,
    price: params.price,
  });
  fbTrackPurchase(params.price, params.currency, params.productType);
}

// ─── CATEGORY NAVIGATION ────────────────────────────────

export function trackCategoryViewed(
  categoryId: string,
  source: "home" | "discover" | "direct"
) {
  posthog.capture("category_viewed", {
    category_id: categoryId,
    source,
  });
  fbTrackCategoryViewed(categoryId);
}

export function trackLevelSelected(categoryId: string, levelNumber: number) {
  posthog.capture("level_selected", {
    category_id: categoryId,
    level_number: levelNumber,
  });
  fbTrackLevelSelected(categoryId, levelNumber);
}
