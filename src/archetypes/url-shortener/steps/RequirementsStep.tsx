import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import styles from './StepContent.module.css';

export const RequirementsStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Functional Requirements</h3>
        <p className={styles.paragraph}>
          The primary functionality of a URL shortener is straightforward. We need to define exactly what features the system must support to satisfy our users' core needs.
        </p>
        <ul className={styles.list}>
          <li>Create a short link from a provided long URL.</li>
          <li>Redirect a short link to its original long URL counterpart.</li>
          <li><strong>Optional but common:</strong> Support custom aliases (e.g., <code className={styles.inlineCode}>tiny.url/my-custom-name</code>).</li>
          <li><strong>Optional but common:</strong> Support expiration times for short links.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Non-Functional Requirements</h3>
        <p className={styles.paragraph}>
          Beyond just working, the system must operate efficiently at scale. These constraints will heavily influence our architectural decisions.
        </p>
        <ul className={styles.list}>
          <li><strong>Low latency redirects:</strong> The redirection process should be near-instantaneous so users don't perceive a delay.</li>
          <li><strong>High availability:</strong> If the service goes down, millions of external links break simultaneously. Uptime is critical.</li>
          <li><strong>Security/Unpredictability:</strong> Short codes should be difficult to guess to prevent malicious actors from scraping or enumerating all links.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Scale Assumptions & Working Set</h3>
        <p className={styles.paragraph}>
          In senior interviews, you must translate monthly aggregates into peak throughput, working-set memory, and multi-year storage:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Writes:</strong> ~100M new URLs created per month (~40 writes/sec average; design for a 5× peak of ~200 writes/sec).
          </li>
          <li>
            <strong>Reads:</strong> ~1B redirects per month (~400 reads/sec average; viral campaigns and push notifications create 25×–50× peak bursts of <strong>10,000–20,000 reads/sec</strong>).
          </li>
          <li>
            <strong>Working-Set Memory (80/20 Rule):</strong> 20% of URLs drive 80% of reads. 20M hot monthly URLs × 500 bytes ≈ <strong>10 GB RAM</strong>, easily cached in a high-availability Redis pair.
          </li>
          <li>
            <strong>Storage:</strong> 100M URLs × 500 bytes = 50 GB/month (600 GB/year). A 5-year retention window requires ~3 TB total disk storage, easily managed by a single modern PostgreSQL cluster with read replicas before needing sharding.
          </li>
        </ul>
      </div>

      <div className={styles.callout}>
        <div className={styles.calloutLabel}>Senior System Design Insight</div>
        <p className={styles.secondaryText}>
          Always distinguish between <em>average load</em> and <em>peak bursts</em>. A single database node can handle 400 reads/sec with ease, but a 20,000 QPS burst during a product launch will saturate database connections unless absorbed by an edge cache tier.
        </p>
      </div>
    </div>
  );
};
