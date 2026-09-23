import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { CodeBlock } from '@/components/lesson/CodeBlock';
import { CacheLoadExplorer } from '../components/CacheLoadExplorer';
import { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
import { urlShortenerChallenges } from '../challenges';
import styles from './StepContent.module.css';

export const CacheStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Why Introduce Caching?</h3>
        <p className={styles.paragraph}>
          A single modern relational database on SSD storage easily handles 5,000–10,000 indexed primary-key reads per second. A 10:1 read/write ratio alone does <em>not</em> necessitate a cache if average load is 400 reads/sec.
        </p>
        <p className={styles.paragraph}>
          Instead, senior engineers introduce an in-memory{' '}
          <button 
            className={styles.conceptLink} 
            onClick={() => onConceptClick('cache')}
          >
            cache
          </button>{' '}
          (such as Redis or Memcached) to solve four specific operational realities:
        </p>
        <ul className={styles.list}>
          <li><strong>Peak Traffic Bursts:</strong> Viral links or marketing campaigns generate 10x–50x traffic spikes (e.g. 20,000+ QPS), instantly exhausting database connection pools and IOPS.</li>
          <li><strong>Strict Latency SLAs:</strong> Serving redirects from RAM takes &lt;1ms (sub-millisecond p99), avoiding 5–20ms disk I/O and query queueing delays.</li>
          <li><strong>Working Set Efficiency (80/20 Rule):</strong> In URL shortening, ~20% of popular links drive &gt;80% of redirect requests. Keeping this hot working set in memory minimizes database disk operations.</li>
          <li><strong>Cost Optimization:</strong> Provisioning memory in a Redis cluster is substantially cheaper per IOP than scaling provisioned IOPS on cloud databases.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Production Cache-Aside Pattern</h3>
        <p className={styles.paragraph}>
          The implementation must isolate cache errors from database lookups, enforce expiration, and bound cache TTL by remaining link lifetime:
        </p>
        <CodeBlock
          language="typescript"
          code={`interface UrlRecord {
  long_url: string;
  expires_at: Date | null;
}

const DEFAULT_CACHE_TTL_SECONDS = 86400; // 24 hours

async function getLongUrl(shortCode: string): Promise<string | null> {
  // 1. Try fetching from Cache (isolated with error handling)
  try {
    const cachedUrl = await redis.get(shortCode);
    if (cachedUrl) {
      return cachedUrl; // Cache Hit (sub-millisecond)
    }
  } catch (err) {
    // Distinguish cache errors/timeouts from cache misses: log and degrade gracefully
    console.error(\`Cache read failed for \${shortCode}, falling back to DB:\`, err);
  }

  // 2. Cache Miss or Cache Unavailable: Fallback to Database
  const dbRecord = await database.query<UrlRecord>(
    'SELECT long_url, expires_at FROM urls WHERE short_code = $1',
    [shortCode]
  );

  if (!dbRecord) {
    return null; // Link does not exist (404)
  }

  // 3. Enforce link expiration
  const now = Date.now();
  if (dbRecord.expires_at && dbRecord.expires_at.getTime() <= now) {
    return null; // Link has expired
  }

  // 4. Calculate bounded TTL: NEVER cache past remaining link lifetime
  let ttlSeconds = DEFAULT_CACHE_TTL_SECONDS;
  if (dbRecord.expires_at) {
    const remainingSeconds = Math.floor((dbRecord.expires_at.getTime() - now) / 1000);
    ttlSeconds = Math.min(DEFAULT_CACHE_TTL_SECONDS, remainingSeconds);
  }

  // 5. Populate cache in background (fire-and-forget, non-blocking)
  // CRITICAL: Database result is preserved even if cache write fails
  if (ttlSeconds > 0) {
    redis.set(shortCode, dbRecord.long_url, { EX: ttlSeconds }).catch(err => {
      console.error(\`Background cache populate failed for \${shortCode}:\`, err);
    });
  }

  return dbRecord.long_url;
}`}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Database Protection During Cache Outages</h3>
        <p className={styles.paragraph}>
          If Redis crashes or a viral key expires, thousands of concurrent requests miss simultaneously (<strong>Thundering Herd</strong> or <strong>Cache Stampede</strong>). To prevent knocking over the database:
        </p>
        <ul className={styles.list}>
          <li><strong>Singleflight / Request Coalescing:</strong> The app server collapses concurrent identical misses into a single shared database query promise.</li>
          <li><strong>Probabilistic Early Expiration (XFetch):</strong> Keys are refreshed asynchronously in the background slightly before their TTL expires based on request frequency.</li>
          <li><strong>Circuit Breakers:</strong> If DB query latency spikes during an outage, the system throttles non-critical requests to maintain availability.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <CacheLoadExplorer />
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['cache-eviction-ttl']!} />
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['thundering-herd-mitigation']!} />
      </div>
    </div>
  );
};
