import type { RestoreOutcome } from "@/hooks/useInAppPurchases";

/**
 * What to tell the player after a restore, as translation keys.
 *
 * Keys rather than strings because every surface that offers Restore renders
 * this through its own `t` — and because all five messages already exist in
 * all seven locales. They were written for the toasts that `src/lib/toast.ts`
 * swallows; nothing had ever displayed them.
 *
 * More than one key for the signed-out case: Apple has replayed the purchases
 * onto the device, which is genuinely all Restore can do without an account,
 * and the sentence has to say both that it worked and what is still owed.
 */
export function restoreOutcomeKeys(outcome: RestoreOutcome): string[] {
  switch (outcome) {
    case "restored":
      return ["iap.purchasesRestored"];
    case "signedOut":
      // Not "restored". Signed out, the app cannot know whether this Apple ID
      // owns anything, so it must not say that it does — see the note in
      // restorePurchases. One sentence, and it names the next step.
      return ["iap.restoreSignInFirst"];
    case "none":
      return ["iap.noPreviousPurchases"];
    case "failed":
      // The check did not complete. Distinct from "you own nothing", which is
      // an answer; this is the absence of one.
      return ["iap.restoreCouldNotCheck"];
    case "notMobile":
      return ["extra.iapRestoreOnlyMobile"];
  }
}
