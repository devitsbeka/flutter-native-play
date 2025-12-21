import { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  headerContent?: ReactNode;
  headerClassName?: string;
}

export function AppLayout({ 
  children, 
  showNav = true, 
  headerContent,
  headerClassName = ""
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Section */}
      {headerContent && (
        <div className={`gradient-teal ${headerClassName}`}>
          {headerContent}
        </div>
      )}
      
      {/* Content Area */}
      <div className="flex-1 content-area rounded-t-3xl -mt-6 relative z-10 pb-24">
        {children}
      </div>

      {/* Bottom Navigation */}
      {showNav && <BottomNavigation />}
    </div>
  );
}
