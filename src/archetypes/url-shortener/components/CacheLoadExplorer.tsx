import { useState, type FC } from 'react';
import styles from './CacheLoadExplorer.module.css';

export const CacheLoadExplorer: FC = () => {
  const [requestsPerSecond, setRequestsPerSecond] = useState<number>(10000);
  const [hitRatio, setHitRatio] = useState<number>(95);

  const calculateDbReads = (rps: number, ratio: number) => {
    return Math.round(rps * (1 - ratio / 100));
  };

  const currentDbReads = calculateDbReads(requestsPerSecond, hitRatio);
  const dbReadsWithoutCache = calculateDbReads(requestsPerSecond, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Cache Load Explorer</h3>
        <p className={styles.subtitle}>Interactive model of cache impact on database read load</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label htmlFor="rps-slider" className={styles.label}>
            <span>Redirect Requests per Second (RPS)</span>
            <span className={styles.value}>{requestsPerSecond.toLocaleString()}</span>
          </label>
          <input
            id="rps-slider"
            type="range"
            min="100"
            max="100000"
            step="100"
            value={requestsPerSecond}
            onChange={(e) => setRequestsPerSecond(Number(e.target.value))}
            className={styles.input}
            aria-label="Redirect Requests per Second"
          />
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="hit-ratio-slider" className={styles.label}>
            <span>Cache Hit Ratio (%)</span>
            <span className={styles.value}>{hitRatio}%</span>
          </label>
          <input
            id="hit-ratio-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={hitRatio}
            onChange={(e) => setHitRatio(Number(e.target.value))}
            className={styles.input}
            aria-label="Cache Hit Ratio"
          />
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>Estimated DB Reads / sec (with cache):</span>
          <span className={styles.resultValue}>{currentDbReads.toLocaleString()}</span>
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>DB Reads / sec (cache disabled):</span>
          <span className={styles.resultValue} style={{ color: 'var(--color-text-secondary)' }}>
            {dbReadsWithoutCache.toLocaleString()}
          </span>
        </div>
        
        <div className={styles.formula}>
          Formula: DB Reads = RPS × (1 - Hit Ratio)
        </div>
      </div>

      <p className={styles.note}>
        Note: This is a simplified model. It excludes writes, retries, replication overhead, and cache stampede effects.
      </p>
    </div>
  );
};
