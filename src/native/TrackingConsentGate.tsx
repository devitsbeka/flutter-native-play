import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, SlidersHorizontal, Lock } from "lucide-react";
import { ConsentScreen, type ConsentPoint } from "@/native/ConsentScreen";
import { subscribeToPrePrompt, acknowledgePrePrompt } from "@/native/trackingConsent";
// The standalone translator rather than useLanguage: this screen is mounted at
// the router root, above LanguageProvider, so the hook would have no context
// to read. Copy still follows the saved language preference.
import { t } from "@/utils/standaloneTranslation";

/**
 * The screen shown immediately before iOS asks about tracking.
 *
 * Apple permits a pre-prompt and reviewers expect one; what gets rejected is a
 * pre-prompt that misrepresents the choice, or one that lets the player dead-end
 * before the system dialog ever appears. The previous version did the latter —
 * "Not now" closed it and deliberately never asked iOS, permanently. That is a
 * large part of why build 34 came back as "unable to locate the App Tracking
 * Transparency permission request".
 *
 * So there is one action, and it leads to Apple's dialog. The real refusal
 * lives there, in "Ask App Not to Track", where iOS records it and the player
 * can revisit it in Settings. This screen's job is only to make the question
 * make sense before it is asked.
 *
 * ## What it may not say
 *
 * The copy used to be titled "Help keep MyTrivia free" and one of the three
 * points was "Keeps the game free — relevant ads earn more, and that is what
 * pays for new questions every week". Guideline 5.1.1(ii) forbids offering an
 * incentive for granting permission, and implying the app depends on consent
 * to stay free is exactly that — the same wording was removed from
 * `NSUserTrackingUsageDescription` in `Info.plist` for the same reason, and
 * the two have to agree.
 *
 * What is left describes only what the advertising identifier is used for,
 * and says in as many words that either answer is fine. Nothing on this
 * screen may reintroduce a benefit contingent on saying yes.
 *
 * Full-bleed rather than a modal card, because at launch it is the first thing
 * the player sees and a sheet floating over an empty app reads as an error.
 * The layout, and the reasoning behind it, is `ConsentScreen`.
 */
export function TrackingConsentGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToPrePrompt(setOpen), []);

  // The accents are Settings' own row colours, in its order.
  const points: ConsentPoint[] = [
    {
      icon: Sparkles,
      tile: "bg-primary/10",
      mark: "text-primary",
      title: t("att.pointRelevantTitle"),
      body: t("att.pointRelevantBody"),
    },
    {
      icon: SlidersHorizontal,
      tile: "bg-emerald-500/10",
      mark: "text-emerald-500",
      title: t("att.pointChoiceTitle"),
      body: t("att.pointChoiceBody"),
    },
    {
      icon: Lock,
      tile: "bg-blue-500/10",
      mark: "text-blue-500",
      title: t("att.pointPrivateTitle"),
      body: t("att.pointPrivateBody"),
    },
  ];

  return (
    <ConsentScreen
      open={open}
      icon={ShieldCheck}
      titleId="att-title"
      title={t("att.title")}
      body={t("att.body")}
      points={points}
      actionLabel={t("att.continue")}
      footnote={t("att.footnote")}
      onAction={acknowledgePrePrompt}
    />
  );
}
