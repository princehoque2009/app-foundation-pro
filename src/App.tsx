import { lazy, Suspense, useEffect, useState } from "react";
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
import { FeatureGate } from "@/components/layout/FeatureGate";
import { SplashScreen } from "@/components/SplashScreen";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides";
import { CallProvider } from "@/contexts/CallContext";

// Core pages loaded eagerly to prevent blank screen flashes on tab switch
import Home from "./pages/Home";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";
import Circles from "./pages/Circles";
import Messages from "./pages/Messages";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";

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
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
const NotificationsManager = () => { useBrowserNotifications(); return null; };

// Secondary pages stay lazy
const Create = lazy(() => import("./pages/Create"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Live = lazy(() => import("./pages/Live"));
const Friends = lazy(() => import("./pages/Friends"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Menu = lazy(() => import("./pages/Menu"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Admin = lazy(() => import("./pages/Admin"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const Favourites = lazy(() => import("./pages/Favourites"));
const SupportPanel = lazy(() => import("./pages/SupportPanel"));
const ModeratorPanel = lazy(() => import("./pages/ModeratorPanel"));
const AdvisorPanel = lazy(() => import("./pages/AdvisorPanel"));
const About = lazy(() => import("./pages/About"));
const CommunityStandards = lazy(() => import("./pages/CommunityStandards"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const ManageInfo = lazy(() => import("./pages/ManageInfo"));
const Lab = lazy(() => import("./pages/Lab"));
const SuspendedAccount = lazy(() => import("./pages/SuspendedAccount"));
const PostView = lazy(() => import("./pages/PostView"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const Memories = lazy(() => import("./pages/Memories"));
const Gaming = lazy(() => import("./pages/Gaming"));

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
    }
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
              <NotificationsManager />
              <AppSettingsProvider>
                <RolesProvider>
                  <CallProvider>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
                    <Route path="/about" element={<About />} />
                    <Route path="/community-standards" element={<CommunityStandards />} />
                    <Route path="/cookies-policy" element={<CookiesPolicy />} />
                    <Route path="/manage-info" element={<ManageInfo />} />
                    <Route path="/post/:postId" element={<ProtectedRoute><PostView /></ProtectedRoute>} />
                    <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                    <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
                    <Route path="/gaming" element={<ProtectedRoute><Gaming /></ProtectedRoute>} />
                    <Route path="/suspended" element={<SuspendedAccount />} />
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  </CallProvider>
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
