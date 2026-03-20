import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const hasResolvedInitialAuth = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const resolveAuthState = (nextSession: Session | null) => {
      if (!isMounted) return;
      hasResolvedInitialAuth.current = true;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setInitialized(true);
    };

    const recoverSessionFromStorage = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          resolveAuthState(null);
          return;
        }

        let recoveredSession = data.session ?? null;

        // If the recovered token is near expiry/expired, attempt a refresh before using it.
        const expiresAtMs = recoveredSession?.expires_at ? recoveredSession.expires_at * 1000 : null;
        const shouldRefresh = !!expiresAtMs && expiresAtMs <= Date.now() + 15_000;
        if (recoveredSession && shouldRefresh) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            recoveredSession = refreshed.session ?? null;
          }
        }

        resolveAuthState(recoveredSession);
      } catch {
        resolveAuthState(null);
      }
    };

    // Safety timeout: if onAuthStateChange never fires (e.g. offline PWA cold start),
    // attempt storage-based recovery after 3 seconds so the app doesn't hang forever.
    const safetyTimer = setTimeout(() => {
      if (!isMounted || hasResolvedInitialAuth.current) return;
      console.warn('[Auth] Safety timeout — attempting session recovery');
      void recoverSessionFromStorage();
    }, 3000);

    // Rely solely on onAuthStateChange which handles INITIAL_SESSION,
    // SIGNED_IN, TOKEN_REFRESHED, and SIGNED_OUT events.
    // Supabase JS v2.47+ fires INITIAL_SESSION automatically on subscribe,
    // so a separate getSession() call is redundant and causes a race
    // where stale cached tokens are emitted before the refresh completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        resolveAuthState(session);

        // Log staff login/logout activity (deferred to avoid deadlock)
        // Only on actual sign-in, not token refreshes or session restores
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              // Check for staff roles using a simple query
              const { data: roles } = await supabase
                .from('user_roles')
                .select('role, custom_roles!inner(is_status_role)')
                .eq('user_id', session.user.id)
                .eq('custom_roles.is_status_role', false);

              // Double-check we actually have non-status roles before inserting
              if (roles && roles.length > 0) {
                await supabase.from('staff_activity').insert({
                  user_id: session.user.id,
                  activity_type: 'login',
                  details: { roles: roles.map(r => r.role) },
                }).throwOnError();
              }
            } catch (e) {
              // Silent fail - staff activity logging is best-effort
              console.debug('Staff activity log skipped:', e);
            }

            // Attempt to claim any active signup promotions (silent - don't block login)
            try {
              const { data: promoResult } = await supabase.functions.invoke('claim-signup-promotion');
              if (promoResult?.claimed) {
                console.log(`Claimed signup promotion: ${promoResult.promotion} (${promoResult.days} days Eclipse+)`);
              }
            } catch (e) {
              // Silent fail - promotions are optional
            }
          }, 0);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Log staff logout before signing out (best-effort)
    if (user) {
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role, custom_roles!inner(is_status_role)')
          .eq('user_id', user.id)
          .eq('custom_roles.is_status_role', false);

        if (roles && roles.length > 0) {
          await supabase.from('staff_activity').insert({
            user_id: user.id,
            activity_type: 'logout',
            details: { roles: roles.map(r => r.role) },
          }).throwOnError();
        }
      } catch (e) {
        console.debug('Staff activity logout log skipped:', e);
      }
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
