// AuthContext - manages authentication state and methods
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_SELECT_COLUMNS } from "@/integrations/supabase/profileColumns";
import { lovable } from "@/integrations/lovable/index";
import { getCountryCodeFromIP } from "@/hooks/useGeoLocation";

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
  gems: number;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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
        const profileData = data as unknown as Profile;
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
                setProfile(updatedProfile as unknown as Profile);
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
  }, []);

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
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signUp = async (email: string, password: string, nickname: string) => {
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
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;
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
          clientId: 'app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4',
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
      
      // Web fallback — use Lovable OAuth
      const result = await lovable.auth.signInWithOAuth("apple", {
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
      const result = await lovable.auth.signInWithOAuth("google", {
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
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
    return { error };
  };

  // Local-only profile state update (no DB write) — used by useCurrency after RPC calls
  const setProfileLocal = useCallback((updates: Partial<Profile>) => {
    lastLocalUpdateRef.current = Date.now();
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Mark as local update to prevent realtime from overwriting
    lastLocalUpdateRef.current = Date.now();

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select(PROFILE_SELECT_COLUMNS)
      .single();

    if (!error && data) {
      setProfile(data as unknown as Profile);
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
