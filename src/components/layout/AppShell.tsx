import { type ReactNode } from 'react';
import { TopToolbar } from './TopToolbar';
import styles from './AppShell.module.css';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <TopToolbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
