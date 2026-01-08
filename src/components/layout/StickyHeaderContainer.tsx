import { ReactNode } from "react";

interface StickyHeaderContainerProps {
  children: ReactNode;
}

export function StickyHeaderContainer({ children }: StickyHeaderContainerProps) {
  return (
    <div className="sticky top-0 z-20">
      {/* Content with backdrop blur */}
      <div className="backdrop-blur-md bg-background/80">
        {children}
      </div>
      
      {/* Fade-out gradient */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-6 -mb-6 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--background) / 0.8), transparent)'
        }}
      />
    </div>
  );
}
