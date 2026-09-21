import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import { CacheLoadExplorer } from '../components/CacheLoadExplorer';
import styles from './StepContent.module.css';

export const CacheStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Introducing the Cache</h3>
        <p className={styles.paragraph}>
          With our 10:1 read-to-write ratio, the database will be heavily bottlenecked by read requests (redirects) long before it hits write limits. To solve this, we introduce a distributed memory{' '}
          <button 
            className={styles.conceptLink} 
            onClick={() => onConceptClick('cache')}
          >
            cache
          </button> (like Redis or Memcached).
        </p>
        <p className={styles.paragraph}>
          We use the <strong>Cache-Aside pattern</strong>. When a read request comes in, the application first checks the cache. If the URL is missing (a cache miss), it falls back to the database, and then populates the cache for subsequent requests.
        </p>
      </div>

      <div className={styles.section}>
        <CodeBlock
          language="typescript"
          code={`async function getLongUrl(shortCode: string): Promise<string | null> {
  // 1. Try fetching from Cache
  const cachedUrl = await redis.get(shortCode);
  if (cachedUrl) {
    return cachedUrl; // Cache Hit
  }

  // 2. Cache Miss: Fallback to Database
  const dbRecord = await database.query(
    'SELECT long_url FROM urls WHERE short_code = $1',
    [shortCode]
  );

  if (dbRecord) {
    // 3. Populate Cache asynchronously (e.g., 24h TTL)
    await redis.set(shortCode, dbRecord.long_url, { EX: 86400 });
    return dbRecord.long_url;
  }

  return null; // Not found
}`}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>TTL and Expiration</h3>
        <p className={styles.paragraph}>
          Because most short URLs are immutable (they don't change once created), a long Time-To-Live (TTL) like 24 hours is often appropriate. This prevents the cache from growing indefinitely while keeping popular links warm. If a URL is configured with an expiration date, the cache TTL should be set to expire at the exact same time to maintain consistency.
        </p>
      </div>

      <div className={styles.section}>
        <CacheLoadExplorer />
      </div>
    </div>
  );
};
