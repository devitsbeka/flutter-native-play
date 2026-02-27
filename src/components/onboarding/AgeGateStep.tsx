import { motion, Variants } from "framer-motion";
import { t } from "@/lib/i18n";

export type AgeGroup = "child" | "teen" | "adult";

interface AgeOption {
  value: AgeGroup;
  labelKey: string;
  emoji: string;
}

const AGE_OPTIONS: AgeOption[] = [
  { value: "child", labelKey: "onboarding.ageUnder16", emoji: "🧒" },
  { value: "teen", labelKey: "onboarding.age16to17", emoji: "🧑" },
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
  onSelect: (age: AgeGroup) => void;
}

export function AgeGateStep({ selectedAge, onSelect }: AgeGateStepProps) {
  return (
    <motion.div
      variants={contentVariants}
      initial="initial"
      animate="animate"
      className="w-full space-y-3"
    >
      {AGE_OPTIONS.map((option) => (
        <motion.button
          key={option.value}
          variants={itemVariants}
          onClick={() => onSelect(option.value)}
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
  );
}
