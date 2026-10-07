import { useEffect, useRef } from 'react';
import { Button } from './Button';
import styles from './LoadError.module.css';

/** Eagerly bundled so recovery never needs the chunk that just failed. */
export function LoadError() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <main className={styles.panel}>
      <h1 ref={heading} tabIndex={-1}>Unable to load this page</h1>
      <p role="alert">A connection problem or a site update may have interrupted loading. Check your connection, then reload.</p>
      <p>Notes and progress already saved in this browser will be kept.</p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
      <a href="/">Return to curriculum</a>
    </main>
  );
}
