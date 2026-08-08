import { MainLayout } from "@/components/layout/MainLayout";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { ArrowLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="sticky top-14 z-30 -mx-4 px-4 py-3 lg-nav flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full hover:bg-muted/70 lg-press flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[20px] font-bold tracking-tight flex-1">{t("notifications.title")}</h1>
          <span className="relative flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <Bell className="h-[19px] w-[19px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </div>
        <div className="mt-3">
          <NotificationsList />
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
