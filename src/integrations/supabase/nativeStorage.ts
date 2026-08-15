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

/**
 * Read-through cache in front of UserDefaults.
 *
 * supabase-js reads the session out of storage to attach a token, and it does
 * that per request rather than once — so on native every read was a round trip
 * across the Capacitor bridge. A seven-minute session was measured at 356
 * `Preferences.get` crossings for a value that changes only when the token
 * refreshes, roughly hourly.
 *
 * That rate is under one per second, so this is not a stall and was not
 * blocking anything: it is waste, on a serial queue shared with every other
 * plugin, and it costs battery for no benefit.
 *
 * Nothing outside this module writes these keys, so the cache cannot go stale
 * behind our back: supabase-js is the only writer, and it writes through
 * `setItem`/`removeItem` below.
 *
 * `inFlight` is separate from `cache` and matters on the first read, when a
 * burst of concurrent callers would otherwise each open their own bridge call
 * for the same key before any of them had an answer to cache.
 */
const cache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

const preferencesAdapter: SupabaseStorageAdapter = {
  async getItem(key) {
    if (cache.has(key)) return cache.get(key) ?? null;

    const pending = inFlight.get(key);
    if (pending) return pending;

    const read = Preferences.get({ key })
      .then(({ value }) => {
        const resolved = value ?? null;
        cache.set(key, resolved);
        return resolved;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, read);
    return read;
  },
  async setItem(key, value) {
    // Cache first, so a read racing this write cannot serve the old token.
    cache.set(key, value);
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    cache.set(key, null);
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
