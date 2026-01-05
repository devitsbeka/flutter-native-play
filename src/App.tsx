import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { NotificationModalProvider } from "@/contexts/NotificationModalContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SplashScreen } from "@/components/SplashScreen";
// VideoPreloader auto-starts on import - no component needed
import "@/components/game/VideoPreloader";
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
import TeamV2 from "./pages/TeamV2";
import RoomRedirect from "./pages/RoomRedirect";
import TVDisplay from "./pages/TVDisplay";
import TVController from "./pages/TVController";
import TVReceiver from "./pages/TVReceiver";

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
import IconAssignment from "./pages/admin/IconAssignment";
import MissingIcons from "./pages/admin/MissingIcons";
import AIGenerations from "./pages/admin/AIGenerations";
import PushNotifications from "./pages/admin/PushNotifications";
import AdminReports from "./pages/admin/Reports";
import AdminFlow from "./pages/admin/Flow";
import PowerUps from "./pages/PowerUps";
import Styleguide from "./pages/Styleguide";
import AllButtons from "./pages/AllButtons";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyEN from "./pages/PrivacyPolicyEN";
import TermsOfService from "./pages/TermsOfService";
import TermsOfServiceEN from "./pages/TermsOfServiceEN";
import Support from "./pages/Support";
import { OfflineBanner } from "./components/shared/OfflineBanner";

const App = () => (
  <AuthProvider>
    <LanguageProvider>
      <OnboardingProvider>
        <SoundProvider>
          <NotificationModalProvider>
            <SplashScreen>
              <TooltipProvider>
            {/* Offline detection banner */}
            <OfflineBanner />
            
            {/* Global persistent background with particles */}
            <GlobalSplineBackground />
            
            <UserPresenceTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              
              <Route path="/adventure-map-admin" element={<AdventureMapAdmin />} />
              <Route path="/power-ups" element={<PowerUps />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/play/:categoryId/:levelId" element={<CategoryQuizPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/world" element={<WorldHome />} />
              <Route path="/game" element={<Game />} />
              <Route path="/team" element={<TeamV2 />} />
              <Route path="/room/:code" element={<RoomRedirect />} />
              <Route path="/tv" element={<TVReceiver />} />
              <Route path="/tv/:code" element={<TVDisplay />} />
              <Route path="/controller/:code" element={<TVController />} />
              <Route path="/vip" element={<VIP />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy-en" element={<PrivacyPolicyEN />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/terms-en" element={<TermsOfServiceEN />} />
              <Route path="/support" element={<Support />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="flow" element={<AdminFlow />} />
                <Route path="content" element={<ContentManager />} />
                <Route path="import" element={<AdminImport />} />
                <Route path="users" element={<AdminOnlineUsers />} />
                <Route path="duplicates" element={<DuplicateScanner />} />
                <Route path="icons" element={<IconLibraryAdmin />} />
                <Route path="tools" element={<QuestionTools />} />
                <Route path="icon-assign" element={<IconAssignment />} />
                <Route path="missing-icons" element={<MissingIcons />} />
                <Route path="ai-generations" element={<AIGenerations />} />
                <Route path="push" element={<PushNotifications />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>
              <Route path="/styleguide" element={<Styleguide />} />
              <Route path="/all-buttons" element={<AllButtons />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
              </TooltipProvider>
            </SplashScreen>
          </NotificationModalProvider>
        </SoundProvider>
      </OnboardingProvider>
    </LanguageProvider>
  </AuthProvider>
);

export default App;
