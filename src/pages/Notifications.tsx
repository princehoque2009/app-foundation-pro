import { MainLayout } from "@/components/layout/MainLayout";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const navigate = useNavigate();

  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <NotificationsList />
      </div>
    </MainLayout>
  );
};

export default Notifications;
