import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/theme-provider";

import { Capacitor } from "@capacitor/core";

import App from "./App.tsx";
import { AppErrorBoundary } from "@/components/shared/AppErrorBoundary";
import { NativeBridge } from "@/native/NativeBridge";
import { initNativeShell } from "@/native/nativeShell";
import "./index.css";

// Status bar and keyboard behaviour, before React paints. No-ops on web.
initNativeShell();

// Register Service Worker for video caching.
//
// Native builds skip it: Capacitor serves the bundle from capacitor://localhost,
// where service workers do not run, so registering only produces a console
// error. Videos come out of the app bundle there instead.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.debug('[SW] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('[SW] Service Worker registration failed:', error);
      });
  });
}

// Tuned defaults: without these every mounted query refetches on each
// window focus / app resume (Capacitor webview), causing request storms
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Outermost on purpose: a provider that throws on mount takes the whole
        tree with it, and that is exactly the crash worth catching. */}
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NativeBridge />
          <ThemeProvider defaultTheme="light" storageKey="quiz-theme">
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
