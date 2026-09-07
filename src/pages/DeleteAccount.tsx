import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Loader2, Shield, LogIn, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

const SUPPORT_EMAIL = "support@mytrivia.io";

type DeletionFailure = {
  message: string;
  /** Tables / storage buckets the function reported it could not clear. */
  failed: string[];
};

/**
 * `functions.invoke` reports a non-2xx answer as an error whose `context`
 * is the raw Response — the JSON body, which names exactly what could not
 * be deleted, is not in `error.message`. Read it so the page can say what
 * actually failed instead of a generic "try again".
 */
async function readDeletionFailure(err: unknown): Promise<DeletionFailure> {
  const fallback =
    err instanceof Error && err.message
      ? err.message
      : "The server could not complete the deletion.";

  const context = (err as { context?: unknown } | null)?.context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const body = await context.clone().json();
      return {
        message: typeof body?.error === "string" ? body.error : fallback,
        failed: Array.isArray(body?.failed) ? body.failed.map(String) : [],
      };
    } catch {
      // Body already consumed or not JSON — fall through.
    }
  }

  return { message: fallback, failed: [] };
}

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [failure, setFailure] = useState<DeletionFailure | null>(null);

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    setFailure(null);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user-account");

      if (error) {
        setFailure(await readDeletionFailure(error));
        return;
      }

      // The function answers 200 only when every table and both storage
      // buckets came back clean, but guard the shape anyway rather than
      // signing the user out of an account that still exists.
      if (data && data.success === false) {
        setFailure({
          message:
            typeof data.error === "string"
              ? data.error
              : "The server could not complete the deletion.",
          failed: Array.isArray(data.failed) ? data.failed.map(String) : [],
        });
        return;
      }

      await signOut();
      setDeleted(true);
    } catch (err) {
      console.error("Delete failed:", err);
      setFailure(await readDeletionFailure(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background flex items-center justify-center p-6">
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
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background flex items-center justify-center p-6">
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
              Quizzes and collections you created, and your drafts
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
              This action is <strong>permanent and irreversible</strong>. Everything above is
              deleted immediately, while you wait — nothing is kept for a grace period. See our{" "}
              <Link to="/privacy-policy" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* Failure — the deletion did not complete, the account still exists */}
        {failure && (
          <div
            role="alert"
            className="bg-destructive/5 border border-destructive/30 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Your account was not deleted
                </p>
                <p className="text-sm text-muted-foreground">{failure.message}</p>
              </div>
            </div>

            {failure.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Could not be removed:
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {failure.failed.map((item) => (
                    <li key={item} className="font-mono break-all">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Nothing was removed and you are still signed in. Please try again, or send this
              message to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              and we will delete the account for you.
            </p>
          </div>
        )}

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
                {isDeleting
                  ? "Deleting..."
                  : failure
                    ? "Try again"
                    : "Yes, permanently delete my account"}
              </ChunkyButton>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setFailure(null);
                }}
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
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
