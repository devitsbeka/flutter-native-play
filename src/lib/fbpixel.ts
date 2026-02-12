// ─── Meta (Facebook) Pixel Helper ───────────────────────
// Type-safe wrapper around window.fbq. Safe to call even if
// the pixel script hasn't loaded yet.

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

// ─── STANDARD EVENTS ────────────────────────────────────

export function fbTrackPageView() {
  fbq("track", "PageView");
}

export function fbTrackCompleteRegistration(method: string) {
  fbq("track", "CompleteRegistration", {
    content_name: method,
    status: true,
  });
}

export function fbTrackLogin(method: string) {
  fbq("trackCustom", "Login", { method });
}

export function fbTrackPurchase(
  value: number,
  currency: string,
  contentName?: string
) {
  fbq("track", "Purchase", {
    value,
    currency,
    content_name: contentName,
  });
}

export function fbTrackStartTrial(categoryId: string) {
  fbq("track", "StartTrial", { content_name: categoryId });
}

export function fbTrackViewContent(
  categoryId: string,
  value: number
) {
  fbq("track", "ViewContent", {
    content_name: categoryId,
    value,
  });
}

// ─── CUSTOM EVENTS ──────────────────────────────────────

export function fbTrackPvpGameStarted(
  categoryId: string,
  opponent: string
) {
  fbq("trackCustom", "PvpGameStarted", {
    category_id: categoryId,
    opponent,
  });
}

export function fbTrackPvpGameFinished(result: string, score: number) {
  fbq("trackCustom", "PvpGameFinished", { result, score });
}

export function fbTrackQuizAbandoned(
  categoryId: string,
  level: number
) {
  fbq("trackCustom", "QuizAbandoned", {
    category_id: categoryId,
    level,
  });
}

export function fbTrackPowerUpUsed(type: string, context: string) {
  fbq("trackCustom", "PowerUpUsed", { type, context });
}

export function fbTrackCategoryViewed(categoryId: string) {
  fbq("trackCustom", "CategoryViewed", { category_id: categoryId });
}

export function fbTrackLevelSelected(
  categoryId: string,
  level: number
) {
  fbq("trackCustom", "LevelSelected", {
    category_id: categoryId,
    level,
  });
}
