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
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: any; error: any }>;
  fetchProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track local updates to prevent duplicate realtime updates
  const lastLocalUpdateRef = useRef<number>(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
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
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@worldquizzes.local`;
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
    const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@worldquizzes.local`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    });
    
    return { data, error };
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
