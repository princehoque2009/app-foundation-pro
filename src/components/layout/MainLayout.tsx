import { ReactNode } from "react";
import { TopHeader } from "./TopHeader";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  navCollapsed?: boolean;
  navDimmed?: boolean;
}

export const MainLayout = ({
  children,
  showHeader = true,
  showBottomNav = true,
  navCollapsed = false,
  navDimmed = false,
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background page-bg">
      {showHeader && <TopHeader />}
      <main
        key={typeof window !== "undefined" ? window.location.pathname : ""}
        className={cn(
          "page-enter min-h-[calc(100vh-120px)]",
          showBottomNav && !navCollapsed && "pb-28"
        )}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav forceCollapsed={navCollapsed} dimmed={navDimmed} />}
    </div>
  );
};
