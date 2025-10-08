import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, phone: string, role: 'requester' | 'supporter') => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          navigate('/update-password');
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: 'requester' | 'supporter'
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) return { error };

      if (data.user) {
        // Generate unique code via RPC if available, else fallback
        let uniqueCode = '';
        try {
          const { data: codeData, error: codeErr } = await supabase.rpc('generate_unique_code');
          if (codeErr) throw codeErr;
          uniqueCode = codeData as string;
        } catch {
          uniqueCode = `CM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        }

        // Ensure profile exists — try direct insert, if RLS blocks it, fallback to RPC if available
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              phone: phone,
              unique_code: uniqueCode,
            });
          if (profileError) {
            console.error('Profile insert error (direct):', profileError);
            // Try RPC fallback (create_profile) which should be a security-definer function
            try {
              const { data: rpcData, error: rpcErr } = await supabase.rpc('create_profile', {
                p_id: data.user.id,
                p_full_name: fullName,
                p_phone: phone,
                p_unique_code: uniqueCode,
              } as any);
              if (rpcErr) {
                console.error('Profile RPC error:', rpcErr);
              } else {
                console.info('Profile created via RPC', rpcData);
              }
            } catch (rpcEx) {
              console.error('Profile RPC exception:', rpcEx);
            }
          }
        } catch (insEx) {
          console.error('Profile insert exception:', insEx);
        }

        // Add user role
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role });
          if (roleError) console.error('Role error:', roleError);
        } catch (roleEx) {
          console.error('Role insert exception:', roleEx);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
