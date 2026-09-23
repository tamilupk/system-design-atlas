import React, { createContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { ProgressState, ProgressAction } from './types';
import { progressReducer, initialState } from './reducer';
import { loadProgress, saveProgress, isStorageAvailable, STORAGE_KEY } from './storage';
import { migrateProgress } from './migrations';

interface ProgressContextValue {
  state: ProgressState;
  dispatch: React.Dispatch<ProgressAction>;
  storageAvailable: boolean;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

function initializeState(defaultState: ProgressState): ProgressState {
  if (typeof window !== 'undefined' && isStorageAvailable()) {
    const saved = loadProgress();
    if (saved) {
      return saved;
    }
  }
  return defaultState;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [storageAvailable, setStorageAvailable] = useState(() => isStorageAvailable());
  const [state, dispatch] = useReducer(progressReducer, initialState, initializeState);

  useEffect(() => {
    setStorageAvailable(isStorageAvailable());
  }, []);

  useEffect(() => {
    if (storageAvailable) {
      saveProgress(state);
    }
  }, [state, storageAvailable]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const migrated = migrateProgress(data);
          if (migrated) {
            dispatch({ type: 'REPLACE_STATE', state: migrated });
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
