import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { TradeoffTable } from '@/components/lesson/TradeoffTable';
import { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
import { urlShortenerChallenges } from '../challenges';
import styles from './StepContent.module.css';

export const TradeoffsStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Architectural Trade-offs</h3>
        <p className={styles.paragraph}>
          System design is rarely about finding the "perfect" solution; it's about choosing the right compromises for your specific requirements. Here are the major trade-offs we evaluate in a URL shortening service.
        </p>
      </div>

      <div className={styles.section}>
        <TradeoffTable
          title="Redirect Status Codes and Cache Headers"
          items={[
            {
              aspect: '301 / 308 Permanent Redirect',
              pros: 'Browsers may cache the destination; cache hits eliminate server round-trips for repeat visitors.',
              cons: 'Origin cannot reliably revoke/expire links or track repeat clicks once cached in browser. (308 preserves method; 301 may change POST to GET).'
            },
            {
              aspect: '302 / 307 Temporary Redirect',
              pros: 'Default behavior indicates temporary relocation. (307 preserves request method; 302 may change POST to GET).',
              cons: 'A 302 does NOT guarantee origin hits if downstream proxies or browser cache headers exist. Origin must explicitly set Cache-Control headers.'
            },
            {
              aspect: 'Bounded Client Cache (e.g. 307 + private, max-age=300)',
              pros: 'Reduces repeat-request latency and server load when a short delay in link changes is acceptable.',
              cons: 'Cached clicks bypass server analytics; revocations and edits may be delayed until the cached redirect expires.'
            }
          ]}
        />
        <p className={styles.paragraph}>
          Choose browser TTLs to match acceptable update delays and analytics gaps; five minutes is an example, not a default.
          Redis reduces database reads. Use <code className={styles.inlineCode}>no-store</code> when redirect responses must not be reused.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Analytics Ingestion: Critical Path Isolation</h3>
        <p className={styles.paragraph}>
          Updating a database column like <code className={styles.inlineCode}>click_count = click_count + 1</code> synchronously during a redirect adds a database write to the request path. On viral links, concurrent updates to the same row can create lock contention.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Inline Database Write:</strong> Adds database round-trip and write latency. Contention grows on hot counters; write failures can delay or fail redirects unless handled separately.
          </li>
          <li>
            <strong>Asynchronous Event Streaming (Kafka / Kinesis):</strong> The app server publishes click events for workers to batch-aggregate into an OLAP store (e.g. ClickHouse, Snowflake). Background publishing favors redirect latency and availability but can lose buffered events; waiting for durable acknowledgement adds latency and a dependency.
          </li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Abuse Prevention</h3>
        <p className={styles.paragraph}>
          Public URL shorteners are targets for phishing and malware. Senior systems apply tiered defense:
        </p>
        <ul className={styles.list}>
          <li><strong>Token-Bucket Rate Limiting:</strong> Enforced at the API Gateway / Load Balancer per IP and API key to prevent bot spam.</li>
          <li><strong>Asynchronous Domain Reputation Scanning:</strong> Validating destination URLs against threat intelligence feeds (Google Safe Browsing) asynchronously or at creation time.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['redirect-status-codes']!} />
      </div>
    </div>
  );
};
