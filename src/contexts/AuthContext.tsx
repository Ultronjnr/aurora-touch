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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Helper to ensure profile exists for signed-in user
    const ensureProfileExists = async (userObj: User | null) => {
      if (!userObj) return;
      try {
        const { data: existing, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userObj.id)
          .single();
        if (error && (error as any).code !== 'PGRST116') {
          console.error('Check profile error:', error);
        }
        if (!existing) {
          const pending = localStorage.getItem('pending_profile');
          const pendingObj = pending ? JSON.parse(pending) : null;
          const full_name = pendingObj?.fullName ?? userObj.user_metadata?.full_name ?? '';
          const phone = pendingObj?.phone ?? userObj.user_metadata?.phone ?? null;
          const unique_code = pendingObj?.unique_code ?? undefined;

          const { error: insertErr } = await supabase.from('profiles').insert({
            id: userObj.id,
            full_name,
            phone,
            unique_code,
          });

          if (insertErr) {
            console.error('Profile insert at sign-in failed:', JSON.stringify(insertErr, Object.getOwnPropertyNames(insertErr)));
            localStorage.setItem('pending_profile', JSON.stringify({ fullName: full_name, phone, unique_code }));
          } else {
            localStorage.removeItem('pending_profile');
          }
        }

        // If there's a pending role saved from sign-up, try to insert it now that user is authenticated
        const pendingRoleRaw = localStorage.getItem('pending_role');
        if (pendingRoleRaw) {
          try {
            const pendingRole = JSON.parse(pendingRoleRaw);
            const { error: roleInsertErr } = await supabase.from('user_roles').insert({
              user_id: pendingRole.user_id || userObj.id,
              role: pendingRole.role,
            });
            if (roleInsertErr) {
              console.error('Pending role insert failed:', JSON.stringify(roleInsertErr, Object.getOwnPropertyNames(roleInsertErr)));
            } else {
              localStorage.removeItem('pending_role');
            }
          } catch (rerr) {
            console.error('Error processing pending_role:', rerr);
          }
        }
      } catch (e) {
        console.error('ensureProfileExists exception:', e);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          navigate('/update-password');
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          await ensureProfileExists(session.user ?? null);
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureProfileExists(session.user);
      }
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
      // Use edge function to sign up
      const signUpResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email`,
            data: {
              full_name: fullName,
              phone: phone,
            }
          }
        })
      });

      const data = await signUpResponse.json();

      if (!signUpResponse.ok) {
        return { error: data.error || { message: 'Sign up failed' } };
      }

      if (data.user) {
        // Generate unique code
        let uniqueCode = '';
        try {
          const { data: codeData, error: codeErr } = await supabase.rpc('generate_unique_code');
          if (codeErr) throw codeErr;
          uniqueCode = codeData as string;
        } catch (e) {
          uniqueCode = `CM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        }

        // Save profile data to insert on verification
        localStorage.setItem('pending_profile', JSON.stringify({ fullName, phone, unique_code: uniqueCode }));
        localStorage.setItem('pending_role', JSON.stringify({ user_id: data.user.id, role }));
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Network error. Please check your connection.' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Use edge function to sign in
      const signInResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await signInResponse.json();

      if (!signInResponse.ok) {
        return { error: data.error || { message: 'Sign in failed' } };
      }

      // Set session with the returned tokens
      if (data.access_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token || '',
        });
        if (sessionError) {
          return { error: sessionError };
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Network error. Please check your connection.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pending_profile');
    localStorage.removeItem('pending_role');
    localStorage.removeItem('pending_email');
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
