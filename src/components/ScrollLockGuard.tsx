import { useScrollLockGuard } from "@/hooks/useScrollLockGuard";

/**
 * Renders nothing. Mounted once, inside the router, so the guard sees every
 * navigation — see useScrollLockGuard for what it releases and why.
 */
export function ScrollLockGuard() {
  useScrollLockGuard();
  return null;
}
