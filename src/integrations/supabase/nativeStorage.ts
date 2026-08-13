import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/**
 * Where the Supabase session lives on each platform.
 *
 * On the web, `localStorage`. Inside the iOS WKWebView it is not a safe home
 * for anything you need tomorrow: web storage there is treated as cache, and
 * iOS evicts it under storage pressure or after a stretch of not opening the
 * app. The session goes with it, and the user is silently signed out — the
 * single most common complaint about Capacitor apps, and one that reads as
 * "this app keeps logging me out" rather than as a bug anyone reports.
 *
 * `@capacitor/preferences` is backed by UserDefaults on iOS, which is real
 * persistence and survives eviction.
 *
 * supabase-js accepts an async storage adapter, so the same three methods
 * serve both platforms; only the implementation behind them differs.
 */

interface SupabaseStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

const preferencesAdapter: SupabaseStorageAdapter = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};

/**
 * Web storage that degrades instead of throwing.
 *
 * Private browsing and storage-full both make `localStorage` setters throw,
 * and an exception from inside the auth client's persistence takes the sign-in
 * with it. Losing persistence is survivable; losing the sign-in is not.
 */
const webAdapter: SupabaseStorageAdapter = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — the session lasts this tab only */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

export const sessionStorageAdapter: SupabaseStorageAdapter =
  Capacitor.isNativePlatform() ? preferencesAdapter : webAdapter;
