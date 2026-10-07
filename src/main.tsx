import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { App } from '@/app/App';
import { reportAssetLoadFailure } from '@/features/asset-recovery/store';

// Register before rendering, including the first lazy route request.
// Keep the rejection intact so existing import catch handlers still run.
window.addEventListener('vite:preloadError', reportAssetLoadFailure);


const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
