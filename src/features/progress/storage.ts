import { ProgressState } from './types';
import { validateProgressState } from './validation';

const STORAGE_KEY = 'system-design-atlas-progress-v1';

export function isStorageAvailable(): boolean {
  try {
    const x = '__storage_test__';
    window.localStorage.setItem(x, x);
    window.localStorage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
}

export function loadProgress(): ProgressState | null {
  if (!isStorageAvailable()) return null;
  try {
    const dataStr = window.localStorage.getItem(STORAGE_KEY);
    if (!dataStr) return null;
    const data = JSON.parse(dataStr);
    const result = validateProgressState(data);
    if (result.valid) {
      return result.state;
    } else {
      console.warn('Progress storage corrupt or invalid schema:', result.error);
      return null;
    }
  } catch (e) {
    console.warn('Failed to parse progress from storage:', e);
    return null;
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveProgress(state: ProgressState): void {
  if (!isStorageAvailable()) return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save progress to storage:', e);
    }
  }, 1000);
}

export function getRawStorage(): string | null {
  if (!isStorageAvailable()) return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearProgress(): void {
  if (!isStorageAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
