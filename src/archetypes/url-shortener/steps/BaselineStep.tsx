import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import styles from './StepContent.module.css';

export const BaselineStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>The Simplest Architecture</h3>
        <p className={styles.paragraph}>
          Before scaling, it's crucial to understand the baseline architecture. The simplest viable system consists of three main components: a Client, a single Application Server, and a single Relational Database. This basic structure is what you see modeled in the diagram.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>The Create Flow</h3>
        <p className={styles.paragraph}>
          When a user wants to shorten a URL:
        </p>
        <ol className={styles.list}>
          <li>The client sends a POST request to the application server with the long URL.</li>
          <li>The server generates a unique short code.</li>
          <li>The server inserts a new record into the database containing the short code and the long URL.</li>
          <li>The server returns the generated short URL to the client.</li>
        </ol>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>The Redirect Flow</h3>
        <p className={styles.paragraph}>
          When a user clicks a short link:
        </p>
        <ol className={styles.list}>
          <li>The client sends a GET request for the short code path.</li>
          <li>The application server queries the database by the short code.</li>
          <li>The database uses its unique index to quickly find the record and returns the long URL.</li>
          <li>The application server sends an HTTP 301/302 response to the client with the long URL in the <code className={styles.inlineCode}>Location</code> header.</li>
        </ol>
      </div>

      <div className={styles.callout}>
        <div className={styles.calloutLabel}>Why Start Here?</div>
        <p className={styles.secondaryText}>
          This monolithic setup works perfectly fine for low-traffic applications or internal tools. It is simple to deploy, easy to debug, and requires minimal operational overhead. Both the create and redirect flows are demonstrated in the flow controls attached to the diagram.
        </p>
      </div>
    </div>
  );
};
