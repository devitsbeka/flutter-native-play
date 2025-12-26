import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { SplashScreen } from "@/components/SplashScreen";
import { SplinePreloader } from "@/components/game/SplinePreloader";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { AdminRoute } from "@/components/admin/AdminRoute";
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
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCategories from "./pages/admin/Categories";
import AdminQuestions from "./pages/admin/Questions";
import AdminOnlineUsers from "./pages/admin/OnlineUsers";

const App = () => (
  <AuthProvider>
    <OnboardingProvider>
      <SoundProvider>
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
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="questions" element={<AdminQuestions />} />
                <Route path="users" element={<AdminOnlineUsers />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </SplashScreen>
      </SoundProvider>
    </OnboardingProvider>
  </AuthProvider>
);

export default App;
