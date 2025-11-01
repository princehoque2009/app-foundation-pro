import { MainLayout } from "@/components/layout/MainLayout";
import { NotificationsList } from "@/components/notifications/NotificationsList";

const Notifications = () => {
  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <NotificationsList />
      </div>
    </MainLayout>
  );
};

export default Notifications;
