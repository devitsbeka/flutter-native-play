import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { passwordStrength } from "@/utils/passwordStrength";

const BAR_COLORS = ["bg-muted", "bg-red-400", "bg-orange-400", "bg-emerald-400", "bg-emerald-500"];
const LABEL_KEYS = ["", "auth.pwWeak", "auth.pwFair", "auth.pwGood", "auth.pwStrong"];

/**
 * Live strength bar + the three policy requirements, shown under the signup
 * password field. Renders nothing while the field is empty so the form
 * doesn't open with a wall of red.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useLanguage();
  if (!password) return null;

  const { score, checks } = passwordStrength(password);
  const rows: Array<[boolean, string]> = [
    [checks.minLength, t("auth.pwRuleLength")],
    [checks.hasLetter, t("auth.pwRuleLetter")],
    [checks.hasDigit, t("auth.pwRuleDigit")],
  ];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                score >= step ? BAR_COLORS[score] : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[52px] text-right">
          {LABEL_KEYS[score] ? t(LABEL_KEYS[score]) : ""}
        </span>
      </div>
      <ul className="space-y-0.5">
        {rows.map(([ok, label]) => (
          <li key={label} className="flex items-center gap-1.5 text-xs">
            {ok ? (
              <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            ) : (
              <X className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <span className={ok ? "text-emerald-600" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
