import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Whether a path already is the main page.
 *
 * Pulled out of the hook so it can be exercised without a router. A trailing
 * slash and an empty pathname are the same screen as "/" — treating them as
 * somewhere else would navigate to a route the user is already on, which in
 * a SPA is silently nothing at all.
 */
export const isHomePath = (pathname: string): boolean =>
  pathname === "" || pathname === "/" || /^\/+$/.test(pathname);

/**
 * What tapping the wordmark does: go to the main page, or reload it when
 * that is already where you are.
 *
 * The reload is deliberate rather than a no-op. Navigating to the route you
 * are on does nothing in a SPA, so on the home screen the logo would look
 * tappable and produce no response — an invisible failure, which is exactly
 * what reads as broken.
 */
export function useGoHomeOrRefresh() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (isHomePath(location.pathname)) {
      window.location.reload();
      return;
    }
    navigate("/");
  }, [navigate, location.pathname]);
}
