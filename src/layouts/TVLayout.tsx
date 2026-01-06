import React from 'react';

interface TVLayoutProps {
  children: React.ReactNode;
}

/**
 * TV Layout wrapper that bypasses the SplashScreen video preloader
 * Used for /tv/* routes to provide instant loading
 */
export const TVLayout: React.FC<TVLayoutProps> = ({ children }) => {
  return (
    <div className="tv-layout min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">
      {children}
    </div>
  );
};

export default TVLayout;
