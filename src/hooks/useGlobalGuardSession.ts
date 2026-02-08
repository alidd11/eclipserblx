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
  }, [loadSession]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('global_guard_session');
    setSession(null);
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
