import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { TradeoffTable } from '@/components/lesson/TradeoffTable';
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
          title="Redirect and Analytics Trade-offs"
          items={[
            {
              aspect: '301 vs 302 Redirects',
              pros: '301: Browser caches redirect, minimizing server load. 302: Server hit every time, ensuring accurate analytics.',
              cons: '301: Analytics and click-tracking become inaccurate because server is bypassed. 302: Higher latency and continuous server load.'
            },
            {
              aspect: 'Inline vs Async Analytics',
              pros: 'Inline: Simple synchronous tracking with immediate consistency. Async (Kafka/SQS): Offloads metrics processing from the critical redirect path.',
              cons: 'Inline: Adds latency to every redirect. Async: Requires message queues, consumers, and eventual consistency handling.'
            }
          ]}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Abuse Prevention</h3>
        <p className={styles.paragraph}>
          Public URL shorteners are huge targets for spammers hiding malicious links. We must weigh the trade-off of friction vs security:
        </p>
        <ul className={styles.list}>
          <li><strong>Rate Limiting:</strong> Essential to prevent bot creation spam, but might block legitimate heavy users.</li>
          <li><strong>URL Validation:</strong> Checking destination URLs against malware blocklists (like Google Safe Browsing) protects users but adds latency to the creation process.</li>
        </ul>
      </div>
    </div>
  );
};
