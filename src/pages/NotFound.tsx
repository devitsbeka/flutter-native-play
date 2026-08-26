import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    // A fixed-height box that owns its scrolling: the native shell disables
    // the document scroller for the life of the app (see nativeShell.ts), so
    // a min-h-screen page that ever grows is frozen solid on the device.
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto flex items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-muted-foreground">{t("extra.notFoundTitle")}</p>
        <p className="mb-4 text-sm text-muted-foreground">{t("extra.notFoundBody")}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t("extra.notFoundHome")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
