import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { SplashScreen } from "@/components/SplashScreen";
import { VideoPreloader } from "@/components/game/VideoPreloader";
import { GlobalSplineBackground } from "@/components/GlobalSplineBackground";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { UserPresenceTracker } from "@/components/UserPresenceTracker";
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
import ContentManager from "./pages/admin/ContentManager";
import AdminOnlineUsers from "./pages/admin/OnlineUsers";
import AdminImport from "./pages/admin/Import";
import DuplicateScanner from "./pages/admin/DuplicateScanner";
import IconLibraryAdmin from "./pages/admin/IconLibrary";
import QuestionTools from "./pages/admin/QuestionTools";
import PowerUps from "./pages/PowerUps";
import Styleguide from "./pages/Styleguide";

const App = () => (
  <AuthProvider>
    <OnboardingProvider>
      <SoundProvider>
        <SplashScreen>
          <TooltipProvider>
            {/* Preload all map videos in background */}
            <VideoPreloader />
            
            {/* Global persistent background with particles */}
            <GlobalSplineBackground />
            
            <Toaster />
            <Sonner />
            <UserPresenceTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/adventure-map" element={<AdventureMap />} />
              <Route path="/adventure-map-admin" element={<AdventureMapAdmin />} />
              <Route path="/power-ups" element={<PowerUps />} />
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
                <Route path="content" element={<ContentManager />} />
                <Route path="import" element={<AdminImport />} />
                <Route path="users" element={<AdminOnlineUsers />} />
                <Route path="duplicates" element={<DuplicateScanner />} />
                <Route path="icons" element={<IconLibraryAdmin />} />
                <Route path="tools" element={<QuestionTools />} />
              </Route>
              <Route path="/styleguide" element={<Styleguide />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </SplashScreen>
      </SoundProvider>
    </OnboardingProvider>
  </AuthProvider>
);

export default App;
