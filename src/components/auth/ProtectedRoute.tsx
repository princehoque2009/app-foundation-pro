import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useRoles } from "@/contexts/RolesContext";
import Maintenance from "@/pages/Maintenance";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireModerator = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, refetch: refetchSettings } = useAppSettings();
  const { isAdmin, isModerator, loading: rolesLoading } = useRoles();
  const location = useLocation();

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

  // Check maintenance mode - only admins can bypass
  if (settings.maintenance_mode && !isAdmin) {
    return <Maintenance onRefresh={refetchSettings} />;
  }

  // Check role requirements
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
