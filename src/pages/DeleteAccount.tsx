import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Loader2, Shield, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account");
      if (error) throw error;
      await signOut();
      setDeleted(true);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete account. Please try again or contact support@mytrivia.io");
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Account Deleted</h1>
          <p className="text-muted-foreground">
            Your account and all associated data have been permanently deleted. 
            This action cannot be undone.
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-primary underline text-sm"
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Delete Your MyTrivia Account</h1>
          <p className="text-muted-foreground text-sm">
            Request permanent deletion of your account and all associated data.
          </p>
        </div>

        {/* What gets deleted */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground text-lg">What will be deleted:</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              Your profile (nickname, avatar, country)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              Game history, scores, and leaderboard rankings
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              Friends list and chat messages
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              Coins, gems, and power-ups
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              PRO subscription status
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              AI-generated avatars and uploaded photos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              All notifications and game room data
            </li>
          </ul>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              This action is <strong>permanent and irreversible</strong>. All data will be removed within 30 days as per our{" "}
              <a href="/privacy-policy-en" className="text-primary underline">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Action area */}
        <div className="space-y-4">
          {!user ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You must be logged in to delete your account.
              </p>
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate("/auth?mode=login")}
                icon={<LogIn className="w-5 h-5" />}
              >
                Log in to continue
              </ChunkyButton>
            </div>
          ) : !showConfirm ? (
            <ChunkyButton
              variant="danger"
              size="lg"
              className="w-full"
              onClick={() => setShowConfirm(true)}
              icon={<Trash2 className="w-5 h-5" />}
            >
              Delete My Account
            </ChunkyButton>
          ) : (
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-4">
              <p className="text-sm text-foreground font-medium text-center">
                Are you absolutely sure? This cannot be undone.
              </p>
              <ChunkyButton
                variant="danger"
                size="lg"
                className="w-full"
                onClick={handleDelete}
                disabled={isDeleting}
                icon={isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              >
                {isDeleting ? "Deleting..." : "Yes, permanently delete my account"}
              </ChunkyButton>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Contact */}
        <p className="text-center text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@mytrivia.io" className="text-primary underline">
            support@mytrivia.io
          </a>
        </p>
      </div>
    </div>
  );
}
