import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { VerificationRequest } from "@/components/settings/VerificationRequest";
import { PrivacyTerms } from "@/components/settings/PrivacyTerms";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Globe, 
  Palette, 
  Download, 
  Trash2, 
  Shield, 
  Smartphone,
  Database,
  Languages,
  Volume2,
  Vibrate,
  Moon,
  Sun,
  Monitor,
  Check
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [autoDownload, setAutoDownload] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  // Sync language preference from Supabase on mount
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
    // Change language immediately (no reload needed)
    i18n.changeLanguage(langCode);
    localStorage.setItem("prangon-language", langCode);

    // Update RTL direction for Arabic
    const lang = LANGUAGES.find(l => l.code === langCode);
    document.documentElement.dir = lang?.rtl ? "rtl" : "ltr";

    // Sync to Supabase if logged in
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

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>
        
        <Tabs defaultValue="account" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="account">{t("settings.account")}</TabsTrigger>
              <TabsTrigger value="privacy">{t("settings.privacy")}</TabsTrigger>
              <TabsTrigger value="notifications">{t("settings.notifications")}</TabsTrigger>
              <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
              <TabsTrigger value="security">{t("settings.security")}</TabsTrigger>
              <TabsTrigger value="data">{t("settings.dataStorage")}</TabsTrigger>
              <TabsTrigger value="verification">{t("settings.verification")}</TabsTrigger>
              <TabsTrigger value="terms">{t("settings.privacyTerms")}</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TabsContent value="account" className="mt-6">
            <AccountSettings />
          </TabsContent>
          
          <TabsContent value="privacy" className="mt-6">
            <PrivacySettings />
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6 space-y-6">
            {/* Theme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t("settings.theme")}
                </CardTitle>
                <CardDescription>
                  {t("settings.themeDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-sm font-medium">{t("settings.light")}</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-sm font-medium">{t("settings.dark")}</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Monitor className="h-6 w-6" />
                    <span className="text-sm font-medium">{t("settings.system")}</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  {t("settings.language")}
                </CardTitle>
                <CardDescription>
                  {t("settings.languageDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                        i18n.language === lang.code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{lang.native}</p>
                        <p className="text-xs text-muted-foreground">{lang.name}</p>
                      </div>
                      {i18n.language === lang.code && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sound & Vibration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
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
          </TabsContent>

          <TabsContent value="data" className="mt-6 space-y-6">
            {/* Auto Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t("settings.autoDownload")}
                </CardTitle>
                <CardDescription>
                  {t("settings.autoDownloadDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>{t("settings.autoDownload")}</Label>
                  <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
                </div>
              </CardContent>
            </Card>

            {/* Data Saver */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {t("settings.dataSaver")}
                </CardTitle>
                <CardDescription>
                  {t("settings.dataSaverDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>{t("settings.dataSaver")}</Label>
                  <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("settings.dataSaverHint")}
                </p>
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
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

            {/* Download Your Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t("settings.downloadData")}
                </CardTitle>
                <CardDescription>
                  {t("settings.downloadDataDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadData} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t("settings.requestExport")}
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  {t("settings.deleteAccount")}
                </CardTitle>
                <CardDescription>
                  {t("settings.deleteAccountDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDeleteAccount} variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("settings.deleteMyAccount")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification" className="mt-6">
            <VerificationRequest />
          </TabsContent>
          
          <TabsContent value="terms" className="mt-6">
            <PrivacyTerms />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
