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

/** Check if a JWT access token contains a valid `sub` claim */
function isTokenValid(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    return !!payload.sub;
  } catch {
    return false;
  }
}

/** Bounded promise — resolves to null if the inner promise takes longer than `ms` */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasResolvedInitialAuth = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const resolveAuthState = (nextSession: Session | null) => {
      if (!isMounted) return;
      hasResolvedInitialAuth.current = true;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    /**
     * Active session recovery — only runs if the listener hasn't fired.
     * 1. getSession from storage (bounded 4s)
     * 2. Validate token has `sub` claim
     * 3. If invalid/expired, attempt refreshSession (bounded 5s)
     * 4. Re-validate after refresh; if still bad, resolve unauthenticated
     */
    const recoverSessionFromStorage = async () => {
      console.log('[Auth] Safety recovery — listener did not fire in time');
      try {
        const result = await withTimeout(supabase.auth.getSession(), 4000);
        if (!result) {
          console.warn('[Auth] getSession timed out');
          resolveAuthState(null);
          return;
        }

        const { data, error } = result;
        if (error) {
          console.warn('[Auth] getSession error:', error.message);
          resolveAuthState(null);
          return;
        }

        let recoveredSession = data.session ?? null;

        // Validate token sanity (must have sub claim) + check expiry
        const tokenOk = isTokenValid(recoveredSession?.access_token);
        const expiresAtMs = recoveredSession?.expires_at ? recoveredSession.expires_at * 1000 : null;
        const isNearExpiry = !!expiresAtMs && expiresAtMs <= Date.now() + 15_000;

        if (recoveredSession && (!tokenOk || isNearExpiry)) {
          console.log('[Auth] Token invalid or near-expiry, attempting refresh');
          const refreshResult = await withTimeout(supabase.auth.refreshSession(), 5000);
          if (refreshResult && !refreshResult.error && refreshResult.data.session) {
            const refreshedToken = refreshResult.data.session.access_token;
            if (isTokenValid(refreshedToken)) {
              recoveredSession = refreshResult.data.session;
            } else {
              console.warn('[Auth] Refreshed token still invalid, clearing session');
              recoveredSession = null;
            }
          } else {
            console.warn('[Auth] Refresh failed or timed out, clearing session');
            recoveredSession = null;
          }
        }

        resolveAuthState(recoveredSession);
      } catch (e) {
        console.warn('[Auth] Recovery exception:', e);
        resolveAuthState(null);
      }
    };

    // Safety timeout: if onAuthStateChange never fires (e.g. offline PWA cold start),
    // attempt storage-based recovery after 3 seconds so the app doesn't hang forever.
    const safetyTimer = setTimeout(() => {
      if (!isMounted || hasResolvedInitialAuth.current) return;
      void recoverSessionFromStorage();
    }, 3000);

    // Rely solely on onAuthStateChange which handles INITIAL_SESSION,
    // SIGNED_IN, TOKEN_REFRESHED, and SIGNED_OUT events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;

        // Validate that the session token is sane before trusting it
        if (currentSession && !isTokenValid(currentSession.access_token)) {
          console.warn('[Auth] Listener received session with invalid token, ignoring');
          // Don't resolve with bad session — let safety timer handle recovery
          return;
        }

        resolveAuthState(currentSession);

        // Log staff login/logout activity (deferred to avoid deadlock)
        if (currentSession?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              const { data: roles } = await supabase
                .from('user_roles')
                .select('role, custom_roles!inner(is_status_role)')
                .eq('user_id', currentSession.user.id)
                .eq('custom_roles.is_status_role', false);

              if (roles && roles.length > 0) {
                await supabase.from('staff_activity').insert({
                  user_id: currentSession.user.id,
                  activity_type: 'login',
                  details: { roles: roles.map(r => r.role) },
                }).throwOnError();
              }
            } catch (e) {
              console.debug('Staff activity log skipped:', e);
            }

            try {
              const { data: promoResult } = await supabase.functions.invoke('claim-signup-promotion');
              if (promoResult?.claimed) {
                console.log(`Claimed signup promotion: ${promoResult.promotion} (${promoResult.days} days Eclipse+)`);
              }
            } catch (e) {
              // Silent fail
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
