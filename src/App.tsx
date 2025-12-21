import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WorldHome from "./pages/WorldHome";
import ContinentPage from "./pages/ContinentPage";
import CountryPage from "./pages/CountryPage";
import CountryQuizPage from "./pages/CountryQuizPage";
import Auth from "./pages/Auth";
import Leaderboards from "./pages/Leaderboards";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WorldHome />} />
          <Route path="/continent/:continentId" element={<ContinentPage />} />
          <Route path="/country/:countryCode" element={<CountryPage />} />
          <Route path="/play/:countryCode/:categoryId" element={<CountryQuizPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
