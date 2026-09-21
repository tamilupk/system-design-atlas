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
        <h3 className={styles.sectionTitle}>Scale Assumptions</h3>
        <p className={styles.paragraph}>
          To design the system appropriately, we need to estimate the traffic and data volume. We'll use these back-of-the-envelope calculations:
        </p>
        <ul className={styles.list}>
          <li><strong>Writes:</strong> ~100 million new URLs created per month (average of ~40 writes per second).</li>
          <li><strong>Reads:</strong> Assuming a 10:1 read-to-write ratio, we will see ~1 billion redirects per month (average of ~400 reads per second).</li>
          <li><strong>Storage:</strong> If each URL record takes ~500 bytes, generating 100M URLs per month requires ~50GB of storage per month, or ~600GB per year.</li>
        </ul>
      </div>

      <div className={styles.callout}>
        <div className={styles.calloutLabel}>System Design Tip</div>
        <p className={styles.secondaryText}>
          These scale numbers are illustrative. In a real interview or design document, stating your assumptions clearly gives you a solid foundation for deciding when a simple relational database is sufficient, and when you need more complex scaling mechanisms like sharding or heavy caching.
        </p>
      </div>
    </div>
  );
};
