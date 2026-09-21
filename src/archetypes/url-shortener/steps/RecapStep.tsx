import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import styles from './StepContent.module.css';

export const RecapStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Architecture Summary</h3>
        <p className={styles.paragraph}>
          We have designed a highly scalable and resilient URL shortener. 
          By starting with a simple monolithic architecture and progressively addressing bottlenecks, we arrived at a robust distributed system.
        </p>
        <p className={styles.paragraph}>
          <strong>Key Decisions Made:</strong>
        </p>
        <ul className={styles.list}>
          <li>We used Base62 encoding for compact, URL-safe identifiers.</li>
          <li>We adopted a Cache-Aside pattern with Redis to protect the database from heavy read traffic.</li>
          <li>We scaled the application horizontally behind a Load Balancer for high availability.</li>
          <li>We chose 302 redirects (or parameterized 301s) assuming accurate analytics were a business requirement.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Interview Follow-up Questions</h3>
        <p className={styles.paragraph}>
          In a real system design interview, your interviewer will likely probe the edges of your design. Think about how you would answer these advanced questions:
        </p>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Analytics at Scale</h4>
            <p className={styles.secondaryText}>"How would you handle analytics (click counts, geographic data) if a link suddenly gets 100,000 clicks per second?"</p>
          </div>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Custom Domains</h4>
            <p className={styles.secondaryText}>"What architectural changes are needed to allow enterprise users to use their own domains (e.g., link.acme.com)?"</p>
          </div>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Data Lifecycle</h4>
            <p className={styles.secondaryText}>"How would you efficiently implement and enforce URL expiration without bloating the database over years?"</p>
          </div>
        </div>
      </div>

      <div className={styles.callout}>
        <div className={styles.calloutLabel}>Self Review</div>
        <p className={styles.secondaryText}>
          Can you trace the path of a request from the client, through the load balancer, application server, cache, and database? If so, you've mastered the core concepts of this design!
        </p>
      </div>
    </div>
  );
};
