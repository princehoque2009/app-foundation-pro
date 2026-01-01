import { useState } from "react";
import { useMessengerSettings } from "@/hooks/useMessengerSettings";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Settings,
  Palette,
  Shield,
  Bell,
  MessageSquare,
  Image,
  RotateCcw,
  Sun,
  Moon,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessengerSettingsProps {
  trigger?: React.ReactNode;
}

const THEME_COLORS = [
  { id: "default", name: "Default", color: "bg-primary" },
  { id: "blue", name: "Blue", color: "bg-blue-500" },
  { id: "purple", name: "Purple", color: "bg-purple-500" },
  { id: "green", name: "Green", color: "bg-green-500" },
  { id: "dark", name: "Dark", color: "bg-gray-800" },
  { id: "light", name: "Light", color: "bg-gray-100" },
];

const CHAT_BACKGROUNDS = [
  { id: null, name: "None", preview: "bg-background" },
  { id: "gradient-1", name: "Gradient 1", preview: "bg-gradient-to-br from-primary/10 to-purple-500/10" },
  { id: "gradient-2", name: "Gradient 2", preview: "bg-gradient-to-br from-blue-500/10 to-green-500/10" },
  { id: "pattern-1", name: "Dots", preview: "bg-muted" },
];

export const MessengerSettings = ({ trigger }: MessengerSettingsProps) => {
  const { settings, updateSettings, resetSettings } = useMessengerSettings();
  const [activeSection, setActiveSection] = useState<string>("appearance");

  const sections = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "behavior", label: "Behavior", icon: MessageSquare },
    { id: "media", label: "Media", icon: Image },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Messenger Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Section tabs */}
          <div className="w-14 border-r bg-muted/30 py-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full p-3 flex flex-col items-center gap-1 text-xs transition-colors",
                  activeSection === section.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <section.icon className="h-5 w-5" />
              </button>
            ))}
          </div>

          {/* Settings content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Appearance */}
              {activeSection === "appearance" && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Chat Theme
                    </h3>
                    <div className="grid grid-cols-6 gap-2">
                      {THEME_COLORS.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => updateSettings({ theme: theme.id as any })}
                          className={cn(
                            "w-10 h-10 rounded-full transition-all",
                            theme.color,
                            settings.theme === theme.id
                              ? "ring-2 ring-primary ring-offset-2"
                              : "hover:scale-110"
                          )}
                          title={theme.name}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-3">Chat Background</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {CHAT_BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id || "none"}
                          onClick={() => updateSettings({ chatBackground: bg.id })}
                          className={cn(
                            "h-16 rounded-lg transition-all border-2",
                            bg.preview,
                            settings.chatBackground === bg.id
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-3">Bubble Style</h3>
                    <Select
                      value={settings.bubbleStyle}
                      onValueChange={(v) => updateSettings({ bubbleStyle: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="sharp">Sharp</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Font Size</h3>
                    <Select
                      value={settings.fontSize}
                      onValueChange={(v) => updateSettings({ fontSize: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Privacy */}
              {activeSection === "privacy" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Read Receipts</Label>
                      <p className="text-xs text-muted-foreground">
                        Let others see when you've read their messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.readReceipts}
                      onCheckedChange={(v) => updateSettings({ readReceipts: v })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Typing Indicator</Label>
                      <p className="text-xs text-muted-foreground">
                        Show when you're typing a message
                      </p>
                    </div>
                    <Switch
                      checked={settings.typingIndicator}
                      onCheckedChange={(v) => updateSettings({ typingIndicator: v })}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="font-medium mb-2 block">Message Requests</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Who can send you message requests
                    </p>
                    <Select
                      value={settings.messageRequests}
                      onValueChange={(v) => updateSettings({ messageRequests: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="none">No One</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Message Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified for new messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.messageAlerts}
                      onCheckedChange={(v) => updateSettings({ messageAlerts: v })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Group Mentions</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when mentioned in groups
                      </p>
                    </div>
                    <Switch
                      checked={settings.groupMentions}
                      onCheckedChange={(v) => updateSettings({ groupMentions: v })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Reaction Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified for message reactions
                      </p>
                    </div>
                    <Switch
                      checked={settings.reactionAlerts}
                      onCheckedChange={(v) => updateSettings({ reactionAlerts: v })}
                    />
                  </div>
                </div>
              )}

              {/* Behavior */}
              {activeSection === "behavior" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Enter to Send</Label>
                      <p className="text-xs text-muted-foreground">
                        Press Enter to send messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.enterToSend}
                      onCheckedChange={(v) => updateSettings({ enterToSend: v })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Scroll</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically scroll to new messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoScroll}
                      onCheckedChange={(v) => updateSettings({ autoScroll: v })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Save Drafts</Label>
                      <p className="text-xs text-muted-foreground">
                        Save unsent messages as drafts
                      </p>
                    </div>
                    <Switch
                      checked={settings.saveDrafts}
                      onCheckedChange={(v) => updateSettings({ saveDrafts: v })}
                    />
                  </div>
                </div>
              )}

              {/* Media */}
              {activeSection === "media" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Download Media</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically download images and videos
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoDownloadMedia}
                      onCheckedChange={(v) => updateSettings({ autoDownloadMedia: v })}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="font-medium mb-2 block">Media Quality</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Quality of uploaded images and videos
                    </p>
                    <Select
                      value={settings.mediaQuality}
                      onValueChange={(v) => updateSettings({ mediaQuality: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (saves data)</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High (best quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Reset */}
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={resetSettings}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
