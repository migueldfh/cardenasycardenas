import React, { createContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { IUser } from "@/types/models";
import { logActivity } from "@/api/logs";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: IUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (mounted) {
        if (error) {
          console.error("Error fetching session:", error);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
          if (event === 'SIGNED_IN') {
            logActivity('USER_LOGIN', { email: newSession.user.email });
          }
        } else {
          setProfile(null);
          setIsLoading(false);
          if (event === 'SIGNED_OUT') {
            logActivity('USER_LOGOUT');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as IUser | null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
