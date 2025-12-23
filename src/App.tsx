import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import CategoryQuizPage from "./pages/CategoryQuizPage";
import Auth from "./pages/Auth";
import Leaderboards from "./pages/Leaderboards";
import Profile from "./pages/Profile";
import WorldHome from "./pages/WorldHome";
import NotFound from "./pages/NotFound";
import Game from "./pages/Game";
import Team from "./pages/Team";
import AdventureMap from "./pages/AdventureMap";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/adventure-map" element={<AdventureMap />} />
      <Route path="/category/:categoryId" element={<CategoryPage />} />
      <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/leaderboards" element={<Leaderboards />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/world" element={<WorldHome />} />
      <Route path="/game" element={<Game />} />
      <Route path="/team" element={<Team />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
