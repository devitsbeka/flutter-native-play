import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Gift, Lock } from "lucide-react";
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
      icon: Gift,
      tile: "bg-emerald-500/10",
      mark: "text-emerald-500",
      title: t("att.pointFreeTitle"),
      body: t("att.pointFreeBody"),
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
