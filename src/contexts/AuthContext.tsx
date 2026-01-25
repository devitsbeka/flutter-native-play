import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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
      console.log('[AuthContext] Profile fetch already in progress for:', userId);
      return null;
    }
    
    profileFetchInProgressRef.current = userId;
    console.log('[AuthContext] Starting profile fetch for:', userId);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      console.log('[AuthContext] Profile fetch result:', { data: data?.nickname, error: error?.message });

      if (error) {
        console.error('[AuthContext] Profile fetch error:', error);
        profileFetchInProgressRef.current = null;
        return null;
      }
      
      if (data) {
        console.log('[AuthContext] Setting profile:', data.nickname);
        setProfile(data as Profile);
        
        // Auto-detect and set country code if not already set
        if (!data.country_code) {
          getCountryCodeFromIP().then(async (detectedCountry) => {
            if (detectedCountry) {
              const { data: updatedProfile } = await supabase
                .from("profiles")
                .update({ country_code: detectedCountry })
                .eq("user_id", userId)
                .select()
                .single();
              
              if (updatedProfile) {
                setProfile(updatedProfile as Profile);
              }
            }
          });
        }
        profileFetchInProgressRef.current = null;
        return data as Profile;
      }
      
      console.log('[AuthContext] No profile found for user');
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
        console.log('Auth state change:', event, currentSession?.user?.id);
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
      console.log('Initial session check:', existingSession?.user?.id);
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
      console.log('[AuthContext] User ID changed, fetching profile for:', userId);
      fetchProfile(userId).finally(() => {
        console.log('[AuthContext] Profile fetch complete, setting loading false');
        setLoading(false);
      });
    } else if (!userId && userIdRef.current) {
      userIdRef.current = null;
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, fetchProfile]);

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
            console.log('Skipping realtime update - local update in progress');
            return;
          }
          
          console.log('Profile updated via realtime:', payload);
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
      // Dynamically import to avoid issues on web
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      
      const result = await SignInWithApple.authorize({
        clientId: 'app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4',
        redirectURI: 'https://sqwpzezkhpqkdyltvsim.supabase.co/auth/v1/callback',
        scopes: 'email name',
      });

      if (result.response) {
        const { identityToken, givenName, familyName, email } = result.response;
        
        // Sign in with Supabase using the Apple ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken,
        });

        // If this is a new user, update their profile with the name from Apple
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
    } catch (error: any) {
      console.error('Apple Sign In error:', error);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://mytrivia.io/',
        },
      });
      
      return { data, error };
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

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Mark as local update to prevent realtime from overwriting
    lastLocalUpdateRef.current = Date.now();

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
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
