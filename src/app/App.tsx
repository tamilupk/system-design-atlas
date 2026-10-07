import { useSyncExternalStore } from 'react';
import { LoadError } from '@/components/ui/LoadError';
import { hasAssetLoadFailed, serverAssetLoadFailed, subscribeToAssetFailure } from '@/features/asset-recovery/store';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { router } from './router';

export function App() {
  const assetFailed = useSyncExternalStore(subscribeToAssetFailure, hasAssetLoadFailed, serverAssetLoadFailed);
  if (assetFailed) return <LoadError />;
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
