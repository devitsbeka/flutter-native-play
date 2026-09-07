import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { t } from "@/lib/i18n";

// The buckets and the reasoning behind them live with the ad-treatment
// predicate that reads them, so the two cannot drift apart.
export type { AgeGroup } from "@/hooks/useAgeGroup";
import type { AgeGroup } from "@/hooks/useAgeGroup";

/**
 * The age gate, and the answer it is now able to accept.
 *
 * It offered exactly two options — 13–17 and 18+ — with no way to say "younger
 * than that" and no path that ends in a refusal. A nine-year-old picked
 * "13–17" and carried on, and both privacy policies say the service is for
 * 13 and over. An age gate that cannot turn anybody away is not an age gate;
 * it is a segmentation question with a compliance label on it.
 *
 * So there is a third option, and it is not a bucket. Choosing it does not
 * write `age_group` — no under-13 value is ever stored, which also keeps COPPA
 * out of the data — it clears the selection, so the parent's Continue button
 * goes back to disabled, and replaces the list with a plain explanation. The
 * way out is "I picked the wrong one", which returns to the choices; there is
 * no path from here to an account.
 *
 * The message is deliberately kind and final. A child who is told "come back
 * when you are 13" and nothing else will simply tap the other button, but
 * saying so is the honest thing and it is what a reviewer looks for.
 */

/** The refusal. Never persisted, never a member of `AgeGroup`. */
const UNDER_13 = "under13" as const;

interface AgeOption {
  value: AgeGroup | typeof UNDER_13;
  labelKey: string;
  emoji: string;
}

const AGE_OPTIONS: AgeOption[] = [
  { value: UNDER_13, labelKey: "onboarding.ageUnder13", emoji: "🧒" },
  { value: "teen", labelKey: "onboarding.age13to17", emoji: "🧑" },
  { value: "adult", labelKey: "onboarding.age18plus", emoji: "🧑‍💼" },
];

const contentVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

interface AgeGateStepProps {
  selectedAge: AgeGroup | null;
  /**
   * `null` clears the selection. The under-13 option sends it, so the step's
   * primary action — which is disabled while nothing is selected — cannot
   * carry a refused player forward.
   */
  onSelect: (age: AgeGroup | null) => void;
}

export function AgeGateStep({ selectedAge, onSelect }: AgeGateStepProps) {
  const [blocked, setBlocked] = useState(false);

  const choose = (value: AgeGroup | typeof UNDER_13) => {
    if (value === UNDER_13) {
      setBlocked(true);
      onSelect(null);
      return;
    }
    setBlocked(false);
    onSelect(value);
  };

  return (
    <AnimatePresence mode="wait">
      {blocked ? (
        <motion.div
          key="age-blocked"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          className="w-full space-y-4"
          role="alert"
        >
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border-4 border-border bg-background p-5 text-center"
            style={{ boxShadow: "0 4px 0 hsl(var(--border))" }}
          >
            <span className="block text-4xl" aria-hidden="true">
              🌱
            </span>
            <span className="mt-3 block font-display text-lg font-bold text-foreground">
              {t("onboarding.ageBlockedTitle")}
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              {t("onboarding.ageBlockedBody")}
            </span>
          </motion.div>

          <motion.button
            variants={itemVariants}
            onClick={() => setBlocked(false)}
            className="w-full rounded-2xl border-4 border-border bg-background px-5 py-3 text-center text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/50"
            style={{ boxShadow: "0 4px 0 hsl(var(--border))" }}
            whileTap={{ scale: 0.97 }}
          >
            {t("onboarding.ageBlockedRetry")}
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          key="age-options"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          className="w-full space-y-3"
        >
          {AGE_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              variants={itemVariants}
              onClick={() => choose(option.value)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-4 text-left font-semibold text-base transition-all duration-200 ${
                selectedAge === option.value
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-background hover:border-primary/50"
              }`}
              style={{
                boxShadow:
                  selectedAge === option.value
                    ? "0 4px 0 hsl(var(--primary))"
                    : "0 4px 0 hsl(var(--border))",
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-foreground">{t(option.labelKey)}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
