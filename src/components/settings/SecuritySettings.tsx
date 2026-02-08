import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Smartphone, Monitor, Tablet, Shield, Clock, LogOut, Wifi, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const SecuritySettings = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDeviceId = localStorage.getItem("prangon_device_id");

  const fetchDevices = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("device-enforcement", {
        body: { action: "list" },
      });
      if (!error && data?.devices) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user?.id]);

  const handleLogoutDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase.functions.invoke("device-enforcement", {
        body: { action: "logout_device", targetDeviceId: deviceId },
      });
      if (error) throw error;
      toast({ title: "Device logged out", description: "The device has been removed." });
      fetchDevices();
    } catch {
      toast({ title: "Error", description: "Failed to logout device.", variant: "destructive" });
    }
  };

  const getDeviceIcon = (name: string) => {
    if (/iPhone|Android/i.test(name)) return <Smartphone className="h-5 w-5" />;
    if (/iPad|Tablet/i.test(name)) return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Device Management
          </CardTitle>
          <CardDescription>
            Only one device can be active at a time. Logging in on a new device will automatically log out other devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No devices found</p>
          ) : (
            devices.map((device: any) => {
              const isCurrent = device.device_id === currentDeviceId;
              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-xl border ${isCurrent ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20"} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isCurrent ? "bg-primary/10" : "bg-muted/50"}`}>
                      {getDeviceIcon(device.device_name || "")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {device.device_name || "Unknown Device"}
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            This device
                          </Badge>
                        )}
                        {device.is_active && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {device.last_seen_at ? format(new Date(device.last_seen_at), "MMM d, h:mm a") : "Never"}
                        </p>
                        {device.ip_address && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Wifi className="h-3 w-3" /> {device.ip_address.substring(0, 15)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isCurrent && device.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleLogoutDevice(device.device_id)}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Security Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <p className="text-sm font-medium">Single Device Policy</p>
            <p className="text-xs text-muted-foreground mt-1">
              For your security, Prangon only allows one active device per account. If you log in from another device, your previous session will be automatically terminated.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm font-medium">Transaction Security</p>
            <p className="text-xs text-muted-foreground mt-1">
              All wallet transactions are processed server-side with rate limiting (5/min). Unusual activity is automatically flagged and reviewed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
