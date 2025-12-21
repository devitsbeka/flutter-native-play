import { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  onPlayClick?: () => void;
  headerContent?: ReactNode;
  headerClassName?: string;
}

export function AppLayout({ 
  children, 
  showNav = true, 
  onPlayClick,
  headerContent,
  headerClassName = ""
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Purple Header Section */}
      {headerContent && (
        <div className={`gradient-purple ${headerClassName}`}>
          {headerContent}
        </div>
      )}
      
      {/* White Content Area */}
      <div className="flex-1 bg-background rounded-t-[2rem] -mt-6 relative z-10 pb-24">
        {children}
      </div>

      {/* Bottom Navigation */}
      {showNav && <BottomNavigation onPlayClick={onPlayClick} />}
    </div>
  );
}
