import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { RolesProvider } from "@/contexts/RolesContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import Home from "./pages/Home";
import Reels from "./pages/Reels";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Circles from "./pages/Circles";
import Live from "./pages/Live";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Menu from "./pages/Menu";
import HelpSupport from "./pages/HelpSupport";
import Admin from "./pages/Admin";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Favourites from "./pages/Favourites";
import SupportPanel from "./pages/SupportPanel";
import ModeratorPanel from "./pages/ModeratorPanel";
import AdvisorPanel from "./pages/AdvisorPanel";
import About from "./pages/About";
import CommunityStandards from "./pages/CommunityStandards";
import CookiesPolicy from "./pages/CookiesPolicy";
import ManageInfo from "./pages/ManageInfo";
import Lab from "./pages/Lab";
import SuspendedAccount from "./pages/SuspendedAccount";
import Wallet from "./pages/Wallet";
import PostView from "./pages/PostView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const SessionManager = () => { useSessionTimeout(); return null; };

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
    }
    
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("hasSeenSplash", "true");
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setShowOnboarding(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          {!showSplash && showOnboarding && (
            <OnboardingSlides onComplete={handleOnboardingComplete} />
          )}
          <BrowserRouter>
            <AuthProvider>
              <SessionManager />
              <AppSettingsProvider>
                <RolesProvider>
                  <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
                  <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/circles" element={<ProtectedRoute><Circles /></ProtectedRoute>} />
                  <Route path="/live" element={<ProtectedRoute><Live /></ProtectedRoute>} />
                  <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
                  <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                  <Route path="/help-support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
                  <Route path="/support-panel" element={<ProtectedRoute requireSupport><SupportPanel /></ProtectedRoute>} />
                  <Route path="/moderator-panel" element={<ProtectedRoute requireModerator><ModeratorPanel /></ProtectedRoute>} />
                  <Route path="/advisor-panel" element={<ProtectedRoute requireAdvisor><AdvisorPanel /></ProtectedRoute>} />
                  <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
                  <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
                  <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
                  <Route path="/lab" element={<ProtectedRoute><Lab /></ProtectedRoute>} />
                  <Route path="/page/:pageId" element={<ProtectedRoute><Lab /></ProtectedRoute>} />
                  <Route path="/community/:groupId" element={<ProtectedRoute><Lab /></ProtectedRoute>} />
                  {/* Legal & Info Pages */}
                  <Route path="/about" element={<About />} />
                  <Route path="/community-standards" element={<CommunityStandards />} />
                  <Route path="/cookies-policy" element={<CookiesPolicy />} />
                  <Route path="/manage-info" element={<ManageInfo />} />
                  <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                  <Route path="/suspended" element={<SuspendedAccount />} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </RolesProvider>
              </AppSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
