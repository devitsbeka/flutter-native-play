import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { SplinePreloader } from "@/components/game/SplinePreloader";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
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
import AdventureMapAdmin from "./pages/AdventureMapAdmin";
import VIP from "./pages/VIP";
import Discover from "./pages/Discover";

const App = () => (
  <AuthProvider>
    <SplashScreen>
      <TooltipProvider>
        {/* Preload Spline animations in background */}
        <SplinePreloader />
        
        {/* Global persistent Spline background - never unmounts */}
        <GlobalSplineBackground />
        
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/adventure-map" element={<AdventureMap />} />
          <Route path="/adventure-map-admin" element={<AdventureMapAdmin />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/world" element={<WorldHome />} />
          <Route path="/game" element={<Game />} />
          <Route path="/team" element={<Team />} />
          <Route path="/vip" element={<VIP />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </SplashScreen>
  </AuthProvider>
);

export default App;
