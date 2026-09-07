/**
 * Whether this bundle is being built for the native app.
 *
 * `npm run build:ios` sets VITE_NATIVE_BUILD=true, and Vite substitutes the
 * literal at build time — so `NATIVE_BUILD` folds to a constant and a
 * `if (!NATIVE_BUILD) { … }` block is dropped by the bundler rather than
 * merely skipped at runtime.
 *
 * That distinction is the whole point. The web checkout path — Stripe, for
 * digital goods — was already behind a `Capacitor.isNativePlatform()` runtime
 * guard, correctly, so no iOS user could reach it. But the code still shipped
 * inside the binary: `create-pro-checkout` and `create-gem-checkout` were both
 * greppable in the reviewed build, and the server functions will mint a
 * Checkout session for any authenticated caller. A single boolean stood
 * between an App Store binary and an alternative payment path for digital
 * content, which is the removal-level version of guideline 3.1.1.
 *
 * Absent is a stronger guarantee than unreachable, and it costs nothing.
 *
 * Keep the runtime `Capacitor.isNativePlatform()` checks as well. They are
 * what keeps the web build correct, and they are what would still be right if
 * someone ever built a native bundle without the flag.
 */
export const NATIVE_BUILD: boolean = import.meta.env.VITE_NATIVE_BUILD === "true";
