import { useEffect, useState } from "react";
import { Scale, ListChecks, RotateCcw, Ban } from "lucide-react";
import { ConsentScreen, type ConsentPoint } from "@/native/ConsentScreen";
import { subscribeToAdPrePrompt, acknowledgeAdPrePrompt } from "@/native/adConsent";
// The standalone translator rather than useLanguage: this screen is mounted at
// the router root, above LanguageProvider, so the hook would have no context
// to read. Copy still follows the saved language preference.
import { t } from "@/utils/standaloneTranslation";

/**
 * The screen shown immediately before Google's European consent form.
 *
 * Third and last in the launch sequence: Apple's tracking dialog, then this,
 * then notifications. Each waits for the one before it, because two consent
 * surfaces racing at launch is how a player taps through one they never read.
 *
 * ## Why this one needs an explanation more than the others
 *
 * Google's form is not ours and cannot be restyled. It opens on a wall of
 * legal text and a list of 198 ad partners, in an app the player has had for
 * about four seconds. Without a sentence of context it reads as something
 * having gone wrong, and the fastest way out of something that looks broken is
 * to tap the first button — which is a consent nobody could honestly call
 * informed.
 *
 * ## Where it appears
 *
 * Only where Google says a form is required and available, which is the EEA,
 * the UK and Switzerland. Everywhere else `ensureAdConsent` never reaches this
 * and the player sees nothing at all. Testing it from outside Europe needs the
 * debug override — see `VITE_UMP_DEBUG_EEA` in `adConsent.ts`.
 *
 * ## What it may not say
 *
 * The same rule the tracking screen follows: nothing here may offer a benefit
 * for consenting, or imply the game needs consent to work. It does not — a
 * player who refuses gets the game with no ads at all, which costs us and
 * costs them nothing. Saying so plainly is both honest and the only version
 * that survives a reviewer reading it.
 */
export function AdConsentGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToAdPrePrompt(setOpen), []);

  // Settings' own row accents, in its order — the same three tiles the
  // tracking and notification screens use, so all three read as one sequence
  // rather than three unrelated interruptions.
  const points: ConsentPoint[] = [
    {
      icon: ListChecks,
      tile: "bg-primary/10",
      mark: "text-primary",
      title: t("adConsent.pointChoiceTitle"),
      body: t("adConsent.pointChoiceBody"),
    },
    {
      icon: Ban,
      tile: "bg-emerald-500/10",
      mark: "text-emerald-500",
      title: t("adConsent.pointRefuseTitle"),
      body: t("adConsent.pointRefuseBody"),
    },
    {
      icon: RotateCcw,
      tile: "bg-blue-500/10",
      mark: "text-blue-500",
      title: t("adConsent.pointChangeTitle"),
      body: t("adConsent.pointChangeBody"),
    },
  ];

  return (
    <ConsentScreen
      open={open}
      icon={Scale}
      titleId="ad-consent-title"
      title={t("adConsent.title")}
      body={t("adConsent.body")}
      points={points}
      actionLabel={t("adConsent.continue")}
      footnote={t("adConsent.footnote")}
      onAction={acknowledgeAdPrePrompt}
    />
  );
}
