import { Bell, Swords, UserPlus, Trophy } from "lucide-react";
import { ConsentScreen, type ConsentPoint } from "@/native/ConsentScreen";
// The standalone translator rather than useLanguage: PushRegistrar is mounted
// high in the tree and this screen has to render wherever it is, so it reads
// the saved language preference directly.
import { t } from "@/utils/standaloneTranslation";

/**
 * The screen shown immediately before iOS asks about notifications.
 *
 * The system dialog was going up cold. "MyTrivia Would Like to Send You
 * Notifications" over the home screen says nothing about *what* would be sent,
 * and iOS shows it **once for the lifetime of the install** — a reflex "Don't
 * Allow" can never be undone from inside the app, only in iOS Settings, which
 * nobody visits. Spending that single dialog without saying what it buys is
 * the most expensive thing this app can do in one tap.
 *
 * So it gets the same treatment tracking already had: say what the
 * notifications are, then hand over to Apple. One action, leading to the real
 * dialog — the honest refusal is "Don't Allow" there, which iOS records and
 * the player can revisit.
 *
 * Presentational only. When it appears, and what happens after, is
 * `PushRegistrar`.
 */
export function PushConsentGate({
  open,
  onContinue,
}: {
  open: boolean;
  onContinue: () => void;
}) {
  // Settings' row accents, in its order — the same three this app's other
  // consent screen uses, so the two read as one pattern.
  const points: ConsentPoint[] = [
    {
      icon: Swords,
      tile: "bg-primary/10",
      mark: "text-primary",
      title: t("pushConsent.pointTurnTitle"),
      body: t("pushConsent.pointTurnBody"),
    },
    {
      icon: UserPlus,
      tile: "bg-emerald-500/10",
      mark: "text-emerald-500",
      title: t("pushConsent.pointFriendsTitle"),
      body: t("pushConsent.pointFriendsBody"),
    },
    {
      icon: Trophy,
      tile: "bg-blue-500/10",
      mark: "text-blue-500",
      title: t("pushConsent.pointRewardsTitle"),
      body: t("pushConsent.pointRewardsBody"),
    },
  ];

  return (
    <ConsentScreen
      open={open}
      icon={Bell}
      titleId="push-consent-title"
      title={t("pushConsent.title")}
      body={t("pushConsent.body")}
      points={points}
      actionLabel={t("pushConsent.continue")}
      footnote={t("pushConsent.footnote")}
      onAction={onContinue}
    />
  );
}
