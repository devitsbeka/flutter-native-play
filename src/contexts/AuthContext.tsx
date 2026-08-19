// AuthContext - manages authentication state and methods
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_SELECT_COLUMNS } from "@/integrations/supabase/profileColumns";
import { callRpc } from "@/integrations/supabase/rpc";
import { oauth } from "@/integrations/oauth";
import { APP_BUNDLE_ID } from "@/config/site";
import { getCountryCodeFromIP } from "@/hooks/useGeoLocation";
import { containsBlockedText } from "@/utils/contentFilter";
import { t as tStandalone } from "@/utils/standaloneTranslation";

export interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  animated_avatar_url: string | null;
  country_code: string;
  total_points: number;
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
  coins: number;
  /** Not in the profile SELECT - merged in from get_my_private_profile(). */
  gems: number;
  /** Same: owner-only, never readable for another player. */
  referral_code?: string | null;
  has_face_photo: boolean | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, nickname: string) => Promise<{ data: any; error: any }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithUsername: (username: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithApple: () => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: any; error: any }>;
  setProfileLocal: (updates: Partial<Profile>) => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The owner's own gems and referral code, which the profile SELECT can no
 * longer carry - the database refuses those two columns to every client role
 * now, because handing them out for OTHER players leaked all 161 referral
 * codes to anyone holding the anon key (i.e. anyone).
 *
 * Merged back onto the profile object so `profile.gems` keeps working at all
 * ~30 call sites. Returns an empty object rather than throwing: this runs on
 * every profile load, and the front end deploys separately from the
 * migration, so it must tolerate the function not existing yet.
 */
async function fetchPrivateProfileFields(userId: string): Promise<Partial<Profile>> {
  try {
    const { data, error } = await callRpc<{ gems?: number; referral_code?: string | null }>(
      "get_my_private_profile",
    );
    if (!error && data) {
      return { gems: data.gems ?? 0, referral_code: data.referral_code ?? null } as Partial<Profile>;
    }
  } catch {
    // fall through to the direct read below
  }

  // The lock_wallet_columns migration (which creates the function above AND
  // revokes the columns) deploys separately from this bundle. Until it lands
  // the columns are still selectable, so read them directly instead of
  // reporting a zero balance: a wrong 0 hides the player's gems and makes
  // every gem purchase look unaffordable (`gems < price` gates the shop).
  // Once the migration is applied the RPC answers and this never runs.
  try {
    const { data } = await supabase
      .from("profiles")
      .select("gems, referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    const row = data as { gems?: number; referral_code?: string | null } | null;
    if (!row) return {};
    return { gems: row.gems ?? 0, referral_code: row.referral_code ?? null } as Partial<Profile>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // UPDATE ... RETURNING re-selects the profile columns, and those no longer
  // carry gems or referral_code. Replacing the object wholesale would blank
  // the player's gem balance on every profile write, so carry them over.
  const setProfileKeepingPrivate = useCallback((next: Profile) => {
    setProfile(prev => ({
      ...next,
      gems: prev?.gems ?? next.gems ?? 0,
      referral_code: prev?.referral_code ?? next.referral_code ?? null,
    }));
  }, []);
  const [loading, setLoading] = useState(true);
  
  // Track local updates to prevent duplicate realtime updates
  const lastLocalUpdateRef = useRef<number>(0);
  // Track if profile fetch is in progress to prevent duplicate fetches
  const profileFetchInProgressRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Prevent duplicate fetches for the same user
    if (profileFetchInProgressRef.current === userId) {
      return null;
    }

    profileFetchInProgressRef.current = userId;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Profile fetch error:', error);
        profileFetchInProgressRef.current = null;
        return null;
      }
      
      if (data) {
        // Explicit-column select degrades the client's inferred type to a
        // generic; cast through unknown to the real Profile shape.
        const profileData = { ...(data as unknown as Profile), ...(await fetchPrivateProfileFields(userId)) };
        setProfile(profileData);

        // Auto-detect and set country code if not already set
        if (!profileData.country_code) {
          getCountryCodeFromIP().then(async (detectedCountry) => {
            if (detectedCountry) {
              const { data: updatedProfile } = await supabase
                .from("profiles")
                .update({ country_code: detectedCountry })
                .eq("user_id", userId)
                .select(PROFILE_SELECT_COLUMNS)
                .single();
              
              if (updatedProfile) {
                setProfileKeepingPrivate(updatedProfile as unknown as Profile);
              }
            }
          });
        }
        profileFetchInProgressRef.current = null;
        return profileData;
      }

      profileFetchInProgressRef.current = null;
      return null;
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err);
      profileFetchInProgressRef.current = null;
      return null;
    }
  }, [setProfileKeepingPrivate]);

  useEffect(() => {
    // Set up auth state listener FIRST - keep it synchronous!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Don't set loading false here - let the profile effect handle it
        if (!currentSession?.user) {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (!existingSession?.user) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect to fetch profile when user ID changes - avoids deadlock
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id ?? null;
    
    // Only fetch if user ID actually changed
    if (userId && userId !== userIdRef.current) {
      userIdRef.current = userId;
      fetchProfile(userId).finally(() => {
        setLoading(false);
      });
    } else if (!userId && userIdRef.current) {
      userIdRef.current = null;
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);

  // Persist last user data to localStorage for returning user screen
  useEffect(() => {
    if (user && profile && user.email) {
      const isRealEmail = !user.email.endsWith('@mytrivia.local');
      const identifier = isRealEmail ? user.email : profile.nickname;
      localStorage.setItem('mytrivia_last_user', JSON.stringify({
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        animated_avatar_url: profile.animated_avatar_url,
        identifier,
      }));
    }
  }, [user, profile]);

  // Realtime subscription for profile updates (e.g., avatar changes)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Skip if we just did a local update (prevents race condition)
          if (Date.now() - lastLocalUpdateRef.current < 2000) {
            return;
          }

          if (payload.new) {
            // Realtime payloads can't carry the wallet-locked columns
            // (gems, referral_code), so a wholesale replace would zero the
            // gem balance — merge while keeping the private fields.
            setProfileKeepingPrivate(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setProfileKeepingPrivate]);

  const signUp = async (email: string, password: string, nickname: string) => {
    // The nickname is a public display name — screen it once here, which
    // covers every signup surface (Auth page, AuthRequiredModal, onboarding,
    // the auto-register dialog) instead of four separate checks.
    if (containsBlockedText(nickname)) {
      return { data: null, error: new Error(tStandalone("extra.textNotAllowed")) };
    }
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nickname },
      },
    });
    
    return { data, error };
  };

  // Username-only signup - creates pseudo-email internally
  const signUpWithUsername = async (username: string, password: string) => {
    // Same screen as signUp — the username IS the public display name here.
    if (containsBlockedText(username)) {
      return { data: null, error: new Error(tStandalone("extra.textNotAllowed")) };
    }
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;

    // Preferred path: the register-username function creates the account
    // pre-confirmed through the admin API. A @mytrivia.local pseudo-email can
    // never receive a confirmation link, so once "Confirm email" is enabled
    // for the project (to keep real-email signups honest), the plain signUp
    // below would create username accounts that can never activate.
    try {
      const { data: reg, error: regError } = await supabase.functions.invoke("register-username", {
        body: { username, password },
      });
      if (!regError && reg?.ok) {
        // Account exists and is confirmed — establish the session.
        return await supabase.auth.signInWithPassword({ email: pseudoEmail, password });
      }
      if (!regError && reg?.error) {
        return { data: null, error: new Error(reg.error) };
      }
      // regError (function not deployed yet / transport): fall through.
    } catch {
      /* fall through to the legacy path */
    }

    // Legacy path — correct for as long as email confirmations stay off.
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: pseudoEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nickname: username },
      },
    });

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  };

  // Username-only sign in - converts to pseudo-email
  const signInWithUsername = async (username: string, password: string) => {
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    });
    
    return { data, error };
  };

  const signInWithApple = async () => {
    try {
      // Check if running on native iOS — use Capacitor plugin
      const { Capacitor } = await import('@capacitor/core');
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios') {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        
        const result = await SignInWithApple.authorize({
          clientId: APP_BUNDLE_ID,
          redirectURI: 'https://sqwpzezkhpqkdyltvsim.supabase.co/auth/v1/callback',
          scopes: 'email name',
        });

        if (result.response) {
          const { identityToken, givenName, familyName } = result.response;
          
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: identityToken,
          });

          if (!error && data.user && (givenName || familyName)) {
            const nickname = givenName || familyName || 'Player';
            if (containsBlockedText(nickname)) return { data, error };
            setTimeout(async () => {
              await supabase
                .from('profiles')
                .update({ nickname })
                .eq('user_id', data.user.id);
            }, 1000);
          }

          return { data, error };
        }
        
        return { data: null, error: new Error('Apple Sign In cancelled') };
      }
      
      // Web fallback — Supabase OAuth redirect
      const result = await oauth.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Apple Sign In error:', error);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      let { error } = await supabase.auth.signOut();
      if (error) {
        // The server refused the global logout (stale/revoked session or a
        // non-JSON gateway response). The user still asked to leave, so fall
        // back to a local-only sign-out, and if even that errors, purge the
        // cached session so a reload can't restore it.
        ({ error } = await supabase.auth.signOut({ scope: 'local' }));
        if (error) {
          Object.keys(localStorage)
            .filter((key) => key.startsWith('sb-') && key.includes('-auth-token'))
            .forEach((key) => localStorage.removeItem(key));
        }
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    return { error: null };
  };

  // Local-only profile state update (no DB write) — used by useCurrency after RPC calls
  const setProfileLocal = useCallback((updates: Partial<Profile>) => {
    lastLocalUpdateRef.current = Date.now();
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Chokepoint for the public display name — several settings surfaces
    // funnel through here.
    if (typeof updates.nickname === "string" && containsBlockedText(updates.nickname)) {
      return { error: new Error(tStandalone("extra.textNotAllowed")) };
    }

    // Mark as local update to prevent realtime from overwriting
    lastLocalUpdateRef.current = Date.now();

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select(PROFILE_SELECT_COLUMNS)
      .single();

    if (!error && data) {
      setProfileKeepingPrivate(data as unknown as Profile);
    }

    return { data, error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signUpWithUsername,
        signIn,
        signInWithUsername,
        signInWithApple,
        signInWithGoogle,
        signOut,
        updateProfile,
        setProfileLocal,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
