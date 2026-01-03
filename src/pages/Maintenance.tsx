import { Construction, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import prangonLogo from "@/assets/prangon-logo.png";

interface MaintenanceProps {
  onRefresh?: () => void;
}

const Maintenance = ({ onRefresh }: MaintenanceProps) => {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src={prangonLogo}
              alt="Prangon"
              className="h-16 w-16 object-contain opacity-80"
            />
          </div>

          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
            <Construction className="h-10 w-10 text-orange-500 animate-pulse" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              We're Under Maintenance
            </h1>
            <p className="text-muted-foreground">
              Prangon is currently undergoing scheduled maintenance to improve your experience.
            </p>
          </div>

          {/* Status */}
          <div className="py-4 px-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span className="text-muted-foreground">
                Maintenance in progress...
              </span>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground">
            We apologize for any inconvenience. Please check back shortly.
          </p>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>

          {/* Footer */}
          <p className="text-xs text-muted-foreground/60">
            If this persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Maintenance;
