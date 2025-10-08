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
          // PGRST116 for no rows might be implementation detail; continue to insert
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
            // store pending and let user know via toast on next page
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
          // Ensure profile now that user is authenticated (RLS will allow insert)
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
        } catch (e) {
          uniqueCode = `CM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        }

        // Try to insert profile now; if RLS blocks it (no session), save pending and it will be created on sign-in
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
            // Detect common RLS/unauthorized errors and treat them as expected during sign-up
            const errMsg = String(profileError.message || profileError.code || profileError.status);
            const isRLS = /row-level security|not authenticated|forbidden|permission/i.test(errMsg);
            if (isRLS) {
              console.info('Profile insert blocked by RLS (expected before sign-in). Saving pending_profile. Full error:', JSON.stringify(profileError, Object.getOwnPropertyNames(profileError)));
            } else {
              console.error('Profile insert error (direct):', JSON.stringify(profileError, Object.getOwnPropertyNames(profileError)));
            }
            // Save pending profile to localStorage so it can be created after email confirmation / sign-in
            localStorage.setItem('pending_profile', JSON.stringify({ fullName, phone, unique_code: uniqueCode }));
          } else {
            localStorage.removeItem('pending_profile');
          }
        } catch (insEx) {
          console.error('Profile insert exception:', insEx);
          localStorage.setItem('pending_profile', JSON.stringify({ fullName, phone, unique_code: uniqueCode }));
        }

        // Add user role — try insert, but if it fails store pending role as well
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role });
          if (roleError) {
            const errMsg = String(roleError.message || roleError.code || roleError.status);
            const isRLS = /row-level security|not authenticated|forbidden|permission/i.test(errMsg);
            if (isRLS) {
              console.info('Role insert blocked by RLS (expected before sign-in). Saving pending_role. Full error:', JSON.stringify(roleError, Object.getOwnPropertyNames(roleError)));
            } else {
              console.error('Role insert error:', JSON.stringify(roleError, Object.getOwnPropertyNames(roleError)));
            }
            localStorage.setItem('pending_role', JSON.stringify({ user_id: data.user.id, role }));
          } else {
            localStorage.removeItem('pending_role');
          }
        } catch (roleEx) {
          console.error('Role insert exception:', roleEx);
          localStorage.setItem('pending_role', JSON.stringify({ user_id: data.user.id, role }));
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
