import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteProvider>
          <ThemeProvider defaultTheme="system" storageKey="quiz-theme">
            <App />
          </ThemeProvider>
        </RouteProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
