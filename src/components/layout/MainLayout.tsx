import { ReactNode } from "react";
import { TopHeader } from "./TopHeader";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  /** Force the bottom bar into its collapsed (icon-only) state */
  navCollapsed?: boolean;
  /** Dim the bottom bar to 50% opacity when idle */
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
    <div className="min-h-screen bg-background">
      {showHeader && <TopHeader />}
      <main
        key={typeof window !== "undefined" ? window.location.pathname : ""}
        className={cn("page-enter", showBottomNav && "pb-24")}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav forceCollapsed={navCollapsed} dimmed={navDimmed} />}
    </div>
  );
};
