import { Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { useSearchParams } from "react-router-dom";
import { ProBannerReel } from "@/components/shop/MobileProCarousel";
import { useNavigate } from "react-router-dom";
import { ProSeatsSection } from "./ProSeatsSection";

// The reel marks bought deals; nothing here is bought from this screen.
const EMPTY_PURCHASES: Set<string> = new Set();
export type ProTier = 'pro' | 'pro_plus' | 'pro_master' | 'standard';

/**
 * The tiers themselves — names, prices, benefits — live in the shop's banner
 * reel, which is what this screen now renders. The table that used to sit
 * here fed the gradient cards below it and nothing else; leaving a second
 * copy of the prices behind, with nothing reading it, is how the two drift.
 */

/**
 * Takes nothing: the reel reads the player's subscription itself. The tier
 * and the dates used to feed the status card, which is what carried the
 * expiry line — say the word and it comes back as a line of its own rather
 * than a second full-width banner.
 */
export function ProPlansSection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedTierName, setPurchasedTierName] = useState("");

  // Handle success callback from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      setPurchasedTierName("PRO");
      setShowSuccessModal(true);
    }
    if (subscriptionStatus) {
      // Clean up URL params (both success and cancelled returns from Stripe)
      searchParams.delete("subscription");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-4">
      {/* Only renders for an active subscriber, so for everyone else this
          screen still opens on the offer. For a subscriber the offer has
          already been taken and the thing they came here to do — hand their
          spare PRO to a friend — was two banners down the page. */}
      {/* px-4 is the reel's own horizontal padding (ProBannerReel's root), so
          the card lines up edge for edge with the tier banners below it
          rather than sitting a few pixels wider on both sides. */}
      <div className="px-4">
        <ProSeatsSection />
      </div>

      {/* The shop's banner reel is the whole screen now. It marks the tier
          the player is on as active and the one above it as buyable, and it
          is the same component the shop uses, so a price or a benefit is
          written once.

          The gradient status and upgrade cards that used to sit under it are
          gone: they sold the same two tiers a second time, in a second
          design, directly below the one that had just sold them. */}
      <ProBannerReel
        slides="pro"
        purchasedItems={EMPTY_PURCHASES}
        isPurchasing={null}
        onItemClick={() => navigate("/power-ups")}
      />

      {/* Purchase Success Modal */}
      <PurchaseSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        itemName={purchasedTierName}
        icon={<Crown className="w-8 h-8 text-amber-500" />}
      />
    </div>
  );
}
