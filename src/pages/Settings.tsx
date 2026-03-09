import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { VerificationRequest } from "@/components/settings/VerificationRequest";
import { PrivacyTerms } from "@/components/settings/PrivacyTerms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Palette, Download, Trash2, Shield, Smartphone, Database, Languages,
  Volume2, Vibrate, Moon, Sun, Monitor, Check, ArrowLeft, ChevronRight,
  User, Lock, Bell, Eye, HelpCircle, AlertTriangle, LogOut, BadgeCheck,
  FileText, Ban, MessageSquareOff, Flag, HeadphonesIcon, BookOpen, Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "zh", name: "Chinese", native: "中文" },
];

type SettingsSection =
  | "main"
  | "account"
  | "privacy"
  | "security"
  | "notifications"
  | "appearance"
  | "data"
  | "safety"
  | "help"
  | "account-control"
  | "verification"
  | "terms";

interface MenuItem {
  id: SettingsSection;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");
  const [autoDownload, setAutoDownload] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  useEffect(() => {
    const loadLanguagePreference = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_settings")
        .select("language")
        .eq("user_id", user.id)
        .single();
      if (data?.language && data.language !== i18n.language) {
        i18n.changeLanguage(data.language);
      }
    };
    loadLanguagePreference();
  }, [user?.id, i18n]);

  const handleLanguageChange = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem("prangon-language", langCode);
    const lang = LANGUAGES.find(l => l.code === langCode);
    document.documentElement.dir = lang?.rtl ? "rtl" : "ltr";
    if (user?.id) {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        language: langCode,
      }, { onConflict: "user_id" });
    }
    toast({ title: t("settings.language"), description: lang?.native || langCode });
  };

  const handleDownloadData = () => {
    toast({
      title: t("settings.downloadData"),
      description: "You'll receive a download link via email within 24 hours.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: t("settings.deleteAccount"),
      description: "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems: MenuItem[] = [
    { id: "account", icon: User, label: "Account", description: "Email, password, personal info", color: "text-blue-500" },
    { id: "privacy", icon: Lock, label: "Privacy", description: "Account type, visibility controls", color: "text-emerald-500" },
    { id: "security", icon: Shield, label: "Security", description: "Devices, login activity, 2FA", color: "text-primary" },
    { id: "notifications", icon: Bell, label: "Notifications", description: "Push, email, activity alerts", color: "text-amber-500" },
    { id: "appearance", icon: Palette, label: "Appearance", description: "Theme, language, sounds", color: "text-purple-500" },
    { id: "data", icon: Database, label: "Data & Storage", description: "Cache, downloads, export", color: "text-cyan-500" },
    { id: "safety", icon: Ban, label: "Safety", description: "Blocked users, reports", color: "text-orange-500" },
    { id: "help", icon: HelpCircle, label: "Help & Support", description: "Contact, guidelines, FAQ", color: "text-teal-500" },
    { id: "verification", icon: BadgeCheck, label: "Verification", description: "Request account verification", color: "text-blue-400" },
    { id: "terms", icon: FileText, label: "Privacy & Terms", description: "Policies and legal info", color: "text-muted-foreground" },
    { id: "account-control", icon: AlertTriangle, label: "Account Control", description: "Deactivate, delete, logout", color: "text-destructive" },
  ];

  const renderSectionHeader = (title: string) => (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
        <button
          onClick={() => setActiveSection("main")}
          className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="font-semibold text-lg text-foreground">{title}</h2>
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-screen-md mx-auto px-4 py-4 space-y-2"
    >
      {/* Profile quick preview */}
      <Card
        className="p-4 mb-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => navigate("/profile")}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-destructive flex items-center justify-center text-primary-foreground font-bold text-lg">
            {user?.email?.[0]?.toUpperCase() || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{user?.email || "Your Profile"}</p>
            <p className="text-xs text-muted-foreground">View and edit your profile</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* Menu items */}
      <div className="space-y-1">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => setActiveSection(item.id)}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-muted/40 transition-all text-left group"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-muted/60 group-hover:bg-muted transition-colors")}>
              <item.icon className={cn("h-5 w-5", item.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  const renderAppearance = () => (
    <div className="max-w-screen-md mx-auto px-4 py-4 space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-5 w-5 text-purple-500" />
            {t("settings.theme")}
          </CardTitle>
          <CardDescription>{t("settings.themeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", icon: Sun, label: t("settings.light") },
              { value: "dark", icon: Moon, label: t("settings.dark") },
              { value: "system", icon: Monitor, label: t("settings.system") },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  theme === value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-5 w-5 text-blue-500" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                  i18n.language === lang.code
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div>
                  <p className="text-sm font-medium">{lang.native}</p>
                  <p className="text-xs text-muted-foreground">{lang.name}</p>
                </div>
                {i18n.language === lang.code && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sound & Vibration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-5 w-5 text-teal-500" />
            {t("settings.soundHaptics")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label>{t("settings.soundEffects")}</Label>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <Label>{t("settings.vibration")}</Label>
            </div>
            <Switch checked={vibrationEnabled} onCheckedChange={setVibrationEnabled} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDataStorage = () => (
    <div className="max-w-screen-md mx-auto px-4 py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5 text-cyan-500" />
            {t("settings.autoDownload")}
          </CardTitle>
          <CardDescription>{t("settings.autoDownloadDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t("settings.autoDownload")}</Label>
            <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-cyan-500" />
            {t("settings.dataSaver")}
          </CardTitle>
          <CardDescription>{t("settings.dataSaverDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t("settings.dataSaver")}</Label>
            <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{t("settings.dataSaverHint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-cyan-500" />
            {t("settings.storage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.cachedData")}</p>
              <p className="text-sm text-muted-foreground">~45 MB</p>
            </div>
            <Button variant="outline" size="sm">{t("settings.clearCache")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5 text-cyan-500" />
            {t("settings.downloadData")}
          </CardTitle>
          <CardDescription>{t("settings.downloadDataDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadData} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t("settings.requestExport")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSafety = () => (
    <div className="max-w-screen-md mx-auto px-4 py-4 space-y-4">
      {[
        { icon: Ban, label: "Blocked Users", desc: "Manage your blocked users list", action: () => navigate("/friends") },
        { icon: MessageSquareOff, label: "Muted Users", desc: "Users you've muted won't know", action: () => {} },
        { icon: Flag, label: "Report a Problem", desc: "Report bugs, issues, or violations", action: () => navigate("/help-support") },
      ].map((item, i) => (
        <Card key={i} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={item.action}>
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <item.icon className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderHelp = () => (
    <div className="max-w-screen-md mx-auto px-4 py-4 space-y-4">
      {[
        { icon: HeadphonesIcon, label: "Contact Support", desc: "Get help from our team", action: () => navigate("/help-support") },
        { icon: BookOpen, label: "Community Guidelines", desc: "Our community standards", action: () => navigate("/community-standards") },
        { icon: Info, label: "About Prangon", desc: "Version and app info", action: () => navigate("/about") },
      ].map((item, i) => (
        <Card key={i} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={item.action}>
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <item.icon className="h-5 w-5 text-teal-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderAccountControl = () => (
    <div className="max-w-screen-md mx-auto px-4 py-4 space-y-6">
      <Card>
        <CardContent className="p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full gap-2 h-12 text-primary border-primary/30 hover:bg-primary/5"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleDeleteAccount}
            variant="destructive"
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("settings.deleteMyAccount")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const sectionTitles: Record<SettingsSection, string> = {
    main: "Settings",
    account: "Account",
    privacy: "Privacy",
    security: "Security",
    notifications: "Notifications",
    appearance: "Appearance",
    data: "Data & Storage",
    safety: "Safety",
    help: "Help & Support",
    "account-control": "Account Control",
    verification: "Verification",
    terms: "Privacy & Terms",
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {activeSection === "main" ? (
          <>
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
              <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <h1 className="font-semibold text-lg text-foreground">{t("settings.title")}</h1>
              </div>
            </div>
            {renderMainMenu()}
          </>
        ) : (
          <>
            {renderSectionHeader(sectionTitles[activeSection])}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {activeSection === "account" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <AccountSettings />
                  </div>
                )}
                {activeSection === "privacy" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <PrivacySettings />
                  </div>
                )}
                {activeSection === "security" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <SecuritySettings />
                  </div>
                )}
                {activeSection === "notifications" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <NotificationSettings />
                  </div>
                )}
                {activeSection === "appearance" && renderAppearance()}
                {activeSection === "data" && renderDataStorage()}
                {activeSection === "safety" && renderSafety()}
                {activeSection === "help" && renderHelp()}
                {activeSection === "account-control" && renderAccountControl()}
                {activeSection === "verification" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <VerificationRequest />
                  </div>
                )}
                {activeSection === "terms" && (
                  <div className="max-w-screen-md mx-auto px-4 py-4">
                    <PrivacyTerms />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Settings;
