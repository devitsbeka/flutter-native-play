/**
 * Facebook Instant Games entry point.
 *
 * This replaces main.tsx for the Facebook build.
 * It initializes the FBInstant SDK, reports loading progress,
 * then mounts the React app with the Facebook platform adapter.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/theme-provider";
import { getPlatform } from "@/platform";
import App from "./App.tsx";
import "./index.css";

declare const FBInstant: any;

async function bootFacebookApp() {
  // Step 1: Initialize the FBInstant SDK
  // This must happen before any other FBInstant calls
  await FBInstant.initializeAsync();

  // Step 2: Report loading progress as we set up
  FBInstant.setLoadingProgress(10);

  // Step 3: Initialize the platform adapter (creates FacebookPlatformAdapter)
  const platform = await getPlatform();
  await platform.initialize();
  FBInstant.setLoadingProgress(30);

  // Step 4: Authenticate the player (FB identity → Supabase JWT)
  const authResult = await platform.signIn();
  FBInstant.setLoadingProgress(60);

  if (!authResult) {
    console.error('[FB] Authentication failed - player will have limited access');
  }

  FBInstant.setLoadingProgress(90);

  // Step 5: Mount React
  const queryClient = new QueryClient();
  const root = createRoot(document.getElementById("root")!);

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ThemeProvider defaultTheme="light" storageKey="quiz-theme">
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );

  FBInstant.setLoadingProgress(100);

  // Step 6: Tell Facebook we're ready to show the game
  await FBInstant.startGameAsync();

  // Step 7: Log that we're up
  platform.logEvent('game_start', {
    player_id: authResult?.userId || 'anonymous',
  });
}

// Boot the app
bootFacebookApp().catch((error) => {
  console.error('[FB] Failed to boot Facebook Instant Game:', error);
});
