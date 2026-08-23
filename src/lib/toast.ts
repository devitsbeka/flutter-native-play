import { toast as sonner } from "sonner";

/**
 * Toasts are off, except for connectivity.
 *
 * The app calls toast() in ~600 places — every confirmation, every limit,
 * every failure — and they land in a card at the top of the screen, over
 * whatever the player is doing. Most of them narrate an action the player
 * just took and watched happen ("request declined" on the screen where they
 * declined it), so the card is noise on top of the answer.
 *
 * Losing a connection is the exception: nothing else on screen explains why
 * an action did nothing, and the player cannot act on it without being told.
 * That case keeps its toast, and a sustained offline state has its own
 * banner (see OfflineBanner) rather than a toast at all.
 *
 * Call sites are unchanged — `toast.error(...)` still compiles and reads the
 * same. Only the delivery is gone. Errors are still written to the console so
 * a failure remains diagnosable in a device log; successes and notices are
 * dropped outright.
 *
 * Every file imports `toast` from here rather than from "sonner" — an import
 * straight from the library would bypass this and put the cards back. A test
 * pins that (see src/__tests__/toastsGoThroughHelper.test.ts).
 */

type ToastArgs = Parameters<typeof sonner.error>;

const swallow =
  (level: "error" | "quiet") =>
  (...args: ToastArgs): string | number => {
    if (level === "error") {
      // Not shown, but not lost: a failed save still needs to be findable
      // when someone asks why nothing happened.
      console.warn("[toast suppressed]", ...args);
    }
    return "";
  };

/**
 * The app-wide toast. Same surface as sonner's, no output.
 *
 * Kept as a drop-in so that turning a category of message back on is a change
 * here, not a sweep through 600 call sites. Callable as well as keyed,
 * because sonner's is — `toast(message, { action })` raises the plain variant
 * with a button, which the room ping uses.
 */
export const toast = Object.assign(swallow("quiet"), {
  error: swallow("error"),
  success: swallow("quiet"),
  info: swallow("quiet"),
  warning: swallow("quiet"),
  message: swallow("quiet"),
});

/**
 * The one thing still allowed to interrupt: the network dropped or a
 * connection could not be made.
 *
 * Use it only for that. It is not a way to mark a message important — a
 * failure the player caused, and can see the result of, still says nothing.
 */
export const connectivityToast = {
  error: (...args: ToastArgs) => sonner.error(...args),
  info: (...args: ToastArgs) => sonner.info(...args),
};
