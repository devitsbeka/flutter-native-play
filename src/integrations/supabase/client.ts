import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { Database } from './types';
import { sessionStorageAdapter } from './nativeStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // UserDefaults on native, localStorage on web. See nativeStorage.ts —
    // WKWebView treats web storage as cache and evicts it, taking the session
    // with it.
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    // The OAuth return leg arrives as a deep link on native and is handed to
    // supabase-js explicitly, rather than being picked out of the page URL.
    // NOTE: flowType is deliberately left at the default (implicit, hash
    // tokens). The password-reset email is requested in the iOS app and
    // opened in Safari — PKCE would strand its code verifier in the app's
    // storage and every cross-device reset would silently fail.
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
  realtime: {
    log_level: 'error',
  },
});

// The recovery marker /reset-password gates on. detectSessionInUrl consumes
// the recovery hash and fires PASSWORD_RECOVERY during client init — before
// any React component can subscribe — so the event is recorded here, at the
// only place guaranteed to be listening in time. Without this gate, an
// already-signed-in user opening an EXPIRED reset link would be shown the
// new-password form and silently change the signed-in account's password.
//
// The forward below also makes the flow independent of the dashboard's
// redirect-URL allowlist (which nobody here can edit — Lovable holds the
// Supabase connection): when the allowlist doesn't know /reset-password,
// GoTrue clamps the email link to the Site URL and the recovery token lands
// on the HOMEPAGE. The token still works — detectSessionInUrl consumes it
// wherever it lands — so on PASSWORD_RECOVERY anywhere but the reset page,
// forward there. If the allowlist does know the path, the link lands on
// /reset-password directly and the forward is a no-op.
if (!Capacitor.isNativePlatform()) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      try {
        sessionStorage.setItem('pw-recovery', '1');
      } catch {
        /* private mode: ResetPassword falls back to its live listener */
      }
      if (window.location.pathname !== '/reset-password') {
        window.location.replace('/reset-password');
      }
    }
  });
}