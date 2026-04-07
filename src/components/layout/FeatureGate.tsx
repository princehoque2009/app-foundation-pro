import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useRoles } from "@/contexts/RolesContext";
import { Construction } from "lucide-react";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallbackTitle?: string;
}

export const FeatureGate = ({ feature, children, fallbackTitle }: FeatureGateProps) => {
  const { settings } = useAppSettings();
  const { isAdmin } = useRoles();

  // Admins always bypass feature gates
  if (isAdmin) return <>{children}</>;

  const settingKey = feature as keyof typeof settings;
  const isEnabled = settingKey in settings ? settings[settingKey] : true;

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {fallbackTitle || "Feature Under Maintenance"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          This feature is currently under maintenance. Please check back later.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};