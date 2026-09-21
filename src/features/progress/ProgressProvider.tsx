import React, { createContext, useReducer, useEffect, ReactNode, useState, useRef } from 'react';
import { ProgressState, ProgressAction } from './types';
import { progressReducer, initialState } from './reducer';
import { loadProgress, saveProgress, isStorageAvailable } from './storage';
import { validateProgressState } from './validation';

interface ProgressContextValue {
  state: ProgressState;
  dispatch: React.Dispatch<ProgressAction>;
  storageAvailable: boolean;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [state, dispatch] = useReducer(progressReducer, initialState);
  const isInitialized = useRef(false);

  useEffect(() => {
    const avail = isStorageAvailable();
    setStorageAvailable(avail);
    
    if (avail && !isInitialized.current) {
      const saved = loadProgress();
      if (saved) {
        dispatch({ type: 'REPLACE_STATE', state: saved });
      }
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current && storageAvailable) {
      saveProgress(state);
    }
  }, [state, storageAvailable]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'system-design-atlas-progress-v1' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const result = validateProgressState(data);
          if (result.valid) {
            dispatch({ type: 'REPLACE_STATE', state: result.state });
          }
        } catch (err) {
          console.warn('Failed to sync progress from other tab', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ProgressContext.Provider value={{ state, dispatch, storageAvailable }}>
      {children}
    </ProgressContext.Provider>
  );
}
