import { useState } from "react";
import { useRoles } from "@/contexts/RolesContext";
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
  const { isAdmin, loading } = useRoles();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Loading state is handled by ProtectedRoute with requireAdmin
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Access control is now handled by ProtectedRoute with requireAdmin prop
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
