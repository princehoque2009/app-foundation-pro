import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { VerificationRequest } from "@/components/settings/VerificationRequest";
import { PrivacyTerms } from "@/components/settings/PrivacyTerms";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const Settings = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="account" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="terms">Privacy & Terms</TabsTrigger>
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
