import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { readCheckoutLaunch, stepsBackToLaunch } from "@/utils/checkoutReturn";

/**
 * Where Stripe Checkout's back arrow lands.
 *
 * It exists only to put the player back where they pressed Buy. Checkout's
 * arrow is a forward navigation to `cancel_url`, so arriving here the tab's
 * history reads
 *
 *     [ … , the page you were on , stripe.com , here ]
 *
 * and simply rendering something would leave the payment screen one Back
 * away — which is the loop the owner hit. So this steps over the whole
 * checkout leg in one jump (see src/utils/checkoutReturn.ts) and, when the
 * depth cannot be trusted, replaces itself with the home screen rather than
 * leaving the player standing on top of Stripe.
 *
 * Nothing to read here, so it draws only a spinner: it is on screen for one
 * frame.
 */
export default function CheckoutCancelled() {
  const navigate = useNavigate();

  useEffect(() => {
    const launch = readCheckoutLaunch();
    const steps = launch ? stepsBackToLaunch(launch.depth, window.history.length) : null;
    if (steps !== null) {
      window.history.go(-steps);
      return;
    }
    navigate(launch?.path ?? "/", { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
