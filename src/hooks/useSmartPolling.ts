import { useEffect, useRef } from 'react';

interface SmartPollingOptions {
  enabled?: boolean;
  activeInterval?: number;   // default 30s
  inactiveInterval?: number; // default 5m
  immediate?: boolean;       // fetch immediately on focus
}

/**
 * useSmartPolling hook
 * Efficiently polls a function based on window visibility.
 */
export const useSmartPolling = (
  callback: () => void | Promise<void>,
  options: SmartPollingOptions = {}
) => {
  const {
    enabled = true,
    activeInterval = 30000,
    inactiveInterval = 300000,
    immediate = true
  } = options;

  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const runPolling = () => {
      const isVisible = document.visibilityState === 'visible';
      const delay = isVisible ? activeInterval : inactiveInterval;

      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, delay);

      // If we just gained focus, trigger immediately if requested
      if (isVisible && immediate) {
        callbackRef.current();
      }
    };

    const handleVisibilityChange = () => {
      runPolling();
    };

    runPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, activeInterval, inactiveInterval, immediate]);
};
