import { useState, useEffect, useCallback } from 'react';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string;
}

export interface GlobalGuardSession {
  accessToken: string;
  refreshToken?: string;
  discordUser: DiscordUser;
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: number;
  }>;
  expiresAt: number;
}

export function useGlobalGuardSession() {
  const [session, setSession] = useState<GlobalGuardSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('global_guard_session');
      if (stored) {
        const parsed = JSON.parse(stored) as GlobalGuardSession;
        
        // Check if session is expired
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem('global_guard_session');
          setSession(null);
        } else {
          setSession(parsed);
        }
      } else {
        setSession(null);
      }
    } catch {
      sessionStorage.removeItem('global_guard_session');
      setSession(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();

    // Listen for storage events (cross-tab sync) and custom events (same-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'global_guard_session') {
        loadSession();
      }
    };

    const handleSessionUpdate = () => {
      loadSession();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('global_guard_session_updated', handleSessionUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('global_guard_session_updated', handleSessionUpdate);
    };
  }, [loadSession]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('global_guard_session');
    setSession(null);
    window.dispatchEvent(new Event('global_guard_session_updated'));
  }, []);

  const refreshSession = useCallback(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    discordUser: session?.discordUser || null,
    guilds: session?.guilds || [],
    logout,
    refreshSession,
  };
}
