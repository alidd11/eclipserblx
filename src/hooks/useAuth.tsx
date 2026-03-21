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

/** Check if session token is fresh (not expired and not near expiry) */
function isSessionFresh(session: Session | null, bufferMs = 30_000): boolean {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 > Date.now() + bufferMs;
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
  const isRefreshing = useRef(false);

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
     * Attempt to refresh the session and return a valid one, or null.
     * Single-flight guard prevents concurrent refresh storms.
     */
    const tryRefresh = async (): Promise<Session | null> => {
      if (isRefreshing.current) return null;
      isRefreshing.current = true;
      try {
        console.log('[Auth] Attempting token refresh');
        const result = await withTimeout(supabase.auth.refreshSession(), 5000);
        if (!result || result.error || !result.data.session) {
          console.warn('[Auth] Refresh failed:', result?.error?.message ?? 'timeout');
          return null;
        }
        const refreshed = result.data.session;
        if (!isTokenValid(refreshed.access_token) || !isSessionFresh(refreshed)) {
          console.warn('[Auth] Refreshed token still invalid/stale');
          return null;
        }
        console.log('[Auth] Refresh succeeded');
        return refreshed;
      } finally {
        isRefreshing.current = false;
      }
    };

    /**
     * Validate and potentially refresh a session before trusting it.
     * Returns a valid session or null.
     */
    const validateAndAccept = async (candidate: Session | null): Promise<Session | null> => {
      if (!candidate) return null;

      // Gate 1: token must have sub claim
      if (!isTokenValid(candidate.access_token)) {
        console.warn('[Auth] Token missing sub claim, attempting refresh');
        return await tryRefresh();
      }

      // Gate 2: token must not be expired/near-expiry
      if (!isSessionFresh(candidate)) {
        console.log('[Auth] Token near-expiry, attempting refresh');
        return await tryRefresh();
      }

      return candidate;
    };

    /**
     * Active session recovery — only runs if the listener hasn't fired.
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

        const validated = await validateAndAccept(data.session ?? null);
        resolveAuthState(validated);
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
      async (event, currentSession) => {
        if (!isMounted) return;

        // For INITIAL_SESSION — apply strict validation before resolving
        if (event === 'INITIAL_SESSION' || !hasResolvedInitialAuth.current) {
          const validated = await validateAndAccept(currentSession);
          resolveAuthState(validated);

          // Log staff login activity (deferred)
          if (validated?.user && event === 'SIGNED_IN') {
            setTimeout(() => logStaffActivity(validated), 0);
          }
          return;
        }

        // For subsequent events (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
        // Token has already been refreshed by Supabase, just validate sub claim
        if (currentSession && !isTokenValid(currentSession.access_token)) {
          console.warn('[Auth] Listener received session with invalid token, ignoring');
          return;
        }

        resolveAuthState(currentSession);

        // Log staff login/logout activity (deferred)
        if (currentSession?.user && event === 'SIGNED_IN') {
          setTimeout(() => logStaffActivity(currentSession), 0);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  /** Deferred staff activity logging — non-blocking */
  const logStaffActivity = async (sess: Session) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, custom_roles!inner(is_status_role)')
        .eq('user_id', sess.user.id)
        .eq('custom_roles.is_status_role', false);

      if (roles && roles.length > 0) {
        await supabase.from('staff_activity').insert({
          user_id: sess.user.id,
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
  };

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
