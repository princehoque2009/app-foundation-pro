import { ReactNode } from "react";
import { TopHeader } from "./TopHeader";
import { BottomNav } from "./BottomNav";

interface MainLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

export const MainLayout = ({ 
  children, 
  showHeader = true, 
  showBottomNav = true 
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <TopHeader />}
      <main className={showBottomNav ? "pb-16" : ""}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};
