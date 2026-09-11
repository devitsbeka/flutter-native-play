import { useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * /profile/:userId — a person, opened by a link.
 *
 * A notification about somebody ("X accepted your request") comes here, and
 * the person is shown by the app's one profile modal (PlayerProfileContext),
 * which any screen can raise. So this route's whole job is: raise that
 * modal, and get out of the way when it closes.
 *
 * It used to render `null` while the modal was up, which is fine while the
 * modal IS up and a bug the moment it is not: `/profile/...` wears the
 * app's global background (GlobalSplineBackground's blob loop), so a
 * closed modal over an empty route is a lavender page with a blob drifting
 * across it and nothing else — no header, no way back (owner: "when i
 * viewed profile and than clicked back button it shows this empty page
 * with blob video on it").
 *
 * Two things keep that from happening again:
 *
 *   - leaving is watched, not remembered. The old effect only left if a ref
 *     said this mount had opened the modal, and cleared that ref on the way
 *     out — so any bounce that landed back on this route with the modal
 *     closed (the same id twice in the history, a back that returns here)
 *     stranded it: nothing reopened the modal, and nothing left. Now the
 *     rule is simply "the modal is not up, so there is nothing here" and it
 *     holds however the route was reached.
 *   - and what it draws while it waits is a spinner, not nothing. The wait
 *     is a frame or two; if it is ever longer, it reads as loading rather
 *     than as a page that failed to arrive.
 */
export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openProfile, currentProfileUserId } = usePlayerProfile();
  /** The id this route has already asked for, so closing does not reopen. */
  const openedFor = useRef<string | null>(null);

  // Open the profile modal BEFORE the browser paints — with a regular
  // effect the route's fallback showed for a frame or two first.
  //
  // Keyed on the id, NOT on currentProfileUserId: keyed on that, closing
  // the modal (id → null) re-ran this and reopened it instantly, and the
  // back button closed and reopened the same modal for ever.
  useLayoutEffect(() => {
    if (userId && openedFor.current !== userId) {
      openedFor.current = userId;
      openProfile(userId);
    }
  }, [userId, openProfile]);

  // Nothing is up: the modal has closed, or it never opened (a bad id, a
  // provider that was not there). Either way this route has nothing to
  // show, so leave it. The delay covers the frame between this mount and
  // the modal's own state landing, and gives the close its animation.
  useEffect(() => {
    if (currentProfileUserId) return;
    const timer = setTimeout(() => {
      // Real history to go back to, or home.
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [currentProfileUserId, navigate]);

  // The modal covers this completely once it is up; this is what shows in
  // the frame before that, and for the moment after a close.
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" aria-busy>
      <span className="sr-only">{t("common.loading")}</span>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
