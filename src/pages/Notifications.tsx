import { MainLayout } from "@/components/layout/MainLayout";

const Notifications = () => {
  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-muted-foreground">Your activity feed</p>
      </div>
    </MainLayout>
  );
};

export default Notifications;
