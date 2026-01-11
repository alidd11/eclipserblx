import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionStatus = 'connected' | 'degraded' | 'offline';

interface NetworkQualityState {
  status: ConnectionStatus;
  lastChecked: Date | null;
  consecutiveFailures: number;
}

const PING_INTERVAL = 30000; // 30 seconds
const DEGRADED_THRESHOLD = 2; // failures before marking as degraded
const OFFLINE_THRESHOLD = 4; // failures before marking as offline

export function useNetworkQuality() {
  const [state, setState] = useState<NetworkQualityState>({
    status: navigator.onLine ? 'connected' : 'offline',
    lastChecked: null,
    consecutiveFailures: 0,
  });
  
  const previousStatus = useRef<ConnectionStatus>(state.status);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Simple lightweight query to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const { error } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      return !error;
    } catch {
      return false;
    }
  }, []);

  const updateStatus = useCallback((isConnected: boolean) => {
    setState(prev => {
      const newFailures = isConnected ? 0 : prev.consecutiveFailures + 1;
      
      let newStatus: ConnectionStatus;
      if (!navigator.onLine) {
        newStatus = 'offline';
      } else if (isConnected) {
        newStatus = 'connected';
      } else if (newFailures >= OFFLINE_THRESHOLD) {
        newStatus = 'offline';
      } else if (newFailures >= DEGRADED_THRESHOLD) {
        newStatus = 'degraded';
      } else {
        newStatus = prev.status;
      }
      
      return {
        status: newStatus,
        lastChecked: new Date(),
        consecutiveFailures: newFailures,
      };
    });
  }, []);

  const runPing = useCallback(async () => {
    if (!navigator.onLine) {
      updateStatus(false);
      return;
    }
    
    const isConnected = await checkConnection();
    updateStatus(isConnected);
  }, [checkConnection, updateStatus]);

  // Force an immediate check
  const forceCheck = useCallback(async () => {
    await runPing();
  }, [runPing]);

  useEffect(() => {
    // Initial check
    runPing();
    
    // Set up periodic pings
    const intervalId = setInterval(runPing, PING_INTERVAL);
    
    // Listen for online/offline events
    const handleOnline = () => {
      // When coming back online, do an immediate check
      runPing();
    };
    
    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        status: 'offline',
        consecutiveFailures: OFFLINE_THRESHOLD,
      }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
    };
  }, [runPing]);

  // Track status changes for "just recovered" detection
  const justRecovered = previousStatus.current !== 'connected' && state.status === 'connected';
  
  useEffect(() => {
    previousStatus.current = state.status;
  }, [state.status]);

  return {
    status: state.status,
    isConnected: state.status === 'connected',
    isDegraded: state.status === 'degraded',
    isOffline: state.status === 'offline',
    justRecovered,
    lastChecked: state.lastChecked,
    forceCheck,
  };
}
