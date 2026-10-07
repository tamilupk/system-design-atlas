// No automatic reload: an offline browser or broken deployment would loop forever.
let failed = false;
const listeners = new Set<() => void>();

export function reportAssetLoadFailure() {
  if (failed) return;
  failed = true;
  listeners.forEach(listener => listener());
}

export function subscribeToAssetFailure(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const hasAssetLoadFailed = () => failed;
export const serverAssetLoadFailed = () => false;
