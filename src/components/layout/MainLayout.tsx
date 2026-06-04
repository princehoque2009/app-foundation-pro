import { ReactNode } from "react";
import { TopHeader } from "./TopHeader";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

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
      <main key={typeof window !== "undefined" ? window.location.pathname : ""} className={cn("page-enter", showBottomNav && "pb-20")}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};
