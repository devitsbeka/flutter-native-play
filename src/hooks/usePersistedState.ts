import { useState, useEffect, useCallback } from 'react';

export function usePersistedState<T>(
  key: string, 
  initialValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (value: string) => T = JSON.parse
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Load initial value from localStorage or use default
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? deserialize(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [key, state, serialize]);

  // Clear function
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, clear];
}
