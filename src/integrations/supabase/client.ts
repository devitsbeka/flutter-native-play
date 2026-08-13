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
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
  realtime: {
    log_level: 'error',
  },
});