import React, { Component, type ErrorInfo, type ReactNode } from "react";
import posthog from "posthog-js";
import { t } from "@/utils/standaloneTranslation";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A crash that reaches the root used to be invisible: React unmounts the tree,
 * the player gets a white screen, and they close the app. Nothing was recorded
 * anywhere - console.error goes to a phone nobody is holding. Every bug in this
 * app has so far been found by someone playing it and saying so out loud, which
 * does not scale past the people we can ask.
 *
 * So: catch it, report it, and show something a player can act on.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A stale tab asking for a chunk that no longer exists is not a bug, it is
    // a deploy. Reload once and it resolves itself; the sessionStorage flag is
    // what stops that turning into a reload loop when it is NOT a deploy.
    if (isStaleChunkError(error)) {
      const key = "mytrivia_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
    }

    // Keep this even though console.log is stripped in production - console.error
    // survives, and it is what a developer with the device in hand will look at.
    console.error("[AppErrorBoundary]", error, errorInfo.componentStack);

    try {
      posthog.captureException(error, {
        boundary: "app-root",
        component_stack: errorInfo.componentStack,
        path: window.location.pathname,
      });
    } catch {
      // Reporting must never be the thing that breaks the error screen.
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("mytrivia_chunk_reload");
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem("mytrivia_chunk_reload");
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Deliberately plain markup with inline styles: this renders when the tree
    // below has failed, so it cannot assume the theme provider, the router or
    // even the stylesheet made it.
    return (
      <div
        style={{
          minHeight: "calc(100dvh - var(--safe-top) - var(--safe-bottom))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          background: "#7E7ADB",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1 }}>🙈</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t("extra.errorOccurred")}</h1>
        <p style={{ fontSize: 15, opacity: 0.85, margin: 0, maxWidth: 320 }}>{t("extra.crashBody")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: "14px 20px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "#FFFFFF", color: "#2A2550", fontSize: 16, fontWeight: 700,
            }}
          >
            {t("extra.crashReload")}
          </button>
          <button
            onClick={this.handleGoHome}
            style={{
              padding: "14px 20px", borderRadius: 16, cursor: "pointer",
              border: "2px solid rgba(255,255,255,0.4)", background: "transparent",
              color: "#FFFFFF", fontSize: 16, fontWeight: 700,
            }}
          >
            {t("extra.crashGoHome")}
          </button>
        </div>
      </div>
    );
  }
}

/** A chunk request that failed because the deployed build moved under us. */
function isStaleChunkError(error: Error): boolean {
  const message = `${error?.message ?? ""} ${error?.name ?? ""}`;
  return (
    /dynamically imported module/i.test(message) ||
    /Loading chunk .* failed/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}
