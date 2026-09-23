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
              pros: 'Clients and CDNs cache destination indefinitely; eliminates subsequent server round-trips for repeat visitors.',
              cons: 'Origin cannot reliably revoke/expire links or track repeat clicks once cached in browser. (308 preserves method; 301 rewrites to GET).'
            },
            {
              aspect: '302 / 307 Temporary Redirect',
              pros: 'Default behavior indicates temporary relocation. (307 preserves request method; 302 rewrites to GET).',
              cons: 'A 302 does NOT guarantee origin hits if downstream proxies or browser cache headers exist. Origin must explicitly set Cache-Control headers.'
            },
            {
              aspect: 'Bounded Client Cache (307 + private max-age=300)',
              pros: 'Absorbs rapid duplicate clicks during viral surges (5-min client cache) while preserving analytics accuracy and revocation control.',
              cons: 'Slight delay (up to max-age) before revocations take effect on active user devices.'
            }
          ]}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Analytics Ingestion: Critical Path Isolation</h3>
        <p className={styles.paragraph}>
          Updating a database column like <code className={styles.inlineCode}>click_count = click_count + 1</code> synchronously during a redirect is a fatal architecture flaw for high-scale systems: it turns read traffic into row-locked write transactions.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Inline Database Write:</strong> High latency (5–30ms added to redirect), severe lock contention on viral links, and database failure brings down redirects.
          </li>
          <li>
            <strong>Asynchronous Event Streaming (Kafka / Kinesis):</strong> The app server emits an in-memory event to a message bus in &lt;1ms and immediately redirects the user. Consumer workers batch-aggregate click metrics and write to an OLAP store (e.g. ClickHouse, Snowflake) without impacting the critical path.
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
