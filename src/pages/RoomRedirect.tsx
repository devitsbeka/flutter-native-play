import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Deep link handler for /room/:code URLs
 * Redirects to /team?join=CODE
 */
export default function RoomRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      navigate(`/team?join=${code}`, { replace: true });
    } else {
      navigate("/team", { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Joining room...</p>
      </div>
    </div>
  );
}
