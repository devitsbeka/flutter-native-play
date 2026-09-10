/**
 * Two browser APIs the app leaned on that WKWebView only grew in iOS 15.4,
 * while the app ships to iOS 15.0. Below 15.4 `structuredClone` is
 * undefined — every multiplayer round start called it, so the host tapped
 * Start and nothing happened — and `crypto.randomUUID` is undefined, so a
 * guest got no session and a trivia could not be created. The deployment
 * target is 15.4 now as well; these stay so a version bump can never
 * reintroduce the class silently.
 */

/** A deep copy of plain data — what goes to a `Json` column. */
export function cloneJson<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A fresh id, a UUID where the platform has one. */
export function newId(prefix = "id"): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
