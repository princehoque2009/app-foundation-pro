import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminMessengerControl } from "@/components/admin/AdminMessengerControl";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminVerifications } from "@/components/admin/AdminVerifications";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminAppSettings } from "@/components/admin/AdminAppSettings";
import { AdminLogsViewer } from "@/components/admin/AdminLogsViewer";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user?.id,
        _role: "admin",
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, checkingAdmin, navigate]);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <AdminUserManagement />;
      case "messenger":
        return <AdminMessengerControl />;
      case "reports":
        return <AdminReports />;
      case "verification":
        return <AdminVerifications />;
      case "notifications":
        return <AdminNotifications />;
      case "settings":
        return <AdminAppSettings />;
      case "logs":
        return <AdminLogsViewer />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </AdminLayout>
  );
};

export default Admin;
