import { type ReactNode } from 'react';
import { TopToolbar } from './TopToolbar';
import { ToolbarProvider } from './ToolbarContext';
import styles from './AppShell.module.css';

interface AppShellProps {
  readonly children: ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <TopToolbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ToolbarProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToolbarProvider>
  );
}
