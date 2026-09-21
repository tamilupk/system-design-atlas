import { type ReactNode } from 'react';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { ToastProvider } from '@/components/ui/Toast';

interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ProgressProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ProgressProvider>
  );
}
