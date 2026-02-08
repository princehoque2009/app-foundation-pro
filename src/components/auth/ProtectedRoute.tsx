import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useRoles } from "@/contexts/RolesContext";
import { useDeviceEnforcement } from "@/hooks/useDeviceEnforcement";
import Maintenance from "@/pages/Maintenance";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
  requireAdvisor?: boolean;
  requireSupport?: boolean;
  requireAnyRole?: ("admin" | "moderator" | "advisor" | "support")[];
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireModerator = false,
  requireAdvisor = false,
  requireSupport = false,
  requireAnyRole,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, refetch: refetchSettings } = useAppSettings();
  const { isAdmin, isModerator, isAdvisor, isSupport, hasAnyRole, loading: rolesLoading } = useRoles();
  const location = useLocation();

  // Device enforcement — registers device on mount + periodic check
  useDeviceEnforcement();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Show loading while checking settings and roles (only if user is logged in)
  if (settingsLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Check maintenance mode - admins, moderators, advisors, support can bypass
  const canBypassMaintenance = isAdmin || isModerator || isAdvisor || isSupport;
  if (settings.maintenance_mode && !canBypassMaintenance) {
    return <Maintenance onRefresh={refetchSettings} />;
  }

  // Check role requirements
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/" replace />;
  }

  if (requireAdvisor && !isAdvisor) {
    return <Navigate to="/" replace />;
  }

  if (requireSupport && !isSupport) {
    return <Navigate to="/" replace />;
  }

  // Check if user has any of the specified roles
  if (requireAnyRole && requireAnyRole.length > 0) {
    if (!hasAnyRole(requireAnyRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
