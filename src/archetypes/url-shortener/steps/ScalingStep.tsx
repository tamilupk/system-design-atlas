import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import styles from './StepContent.module.css';

export const ScalingStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Horizontal Scaling</h3>
        <p className={styles.paragraph}>
          As traffic grows, a single application server will eventually run out of CPU or memory. Because our application servers are stateless (they rely on the database and cache for state), we can scale them horizontally by placing them behind a{' '}
          <button 
            className={styles.conceptLink} 
            onClick={() => onConceptClick('load-balancer')}
          >
            load balancer
          </button>.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Scaling the Database</h3>
        <p className={styles.paragraph}>
          Even with caching, the database remains a critical chokepoint for writes and cache misses. We scale the database in stages:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Read Replicas:</strong> We can configure a Primary-Replica setup. Writes go to the primary node, while reads (cache misses) go to read replicas. A trade-off here is <em>replication lag</em>: if a user creates a link and immediately queries it on a replica, it might not be there yet.
          </li>
          <li>
            <strong>Partitioning (Sharding):</strong> At extreme scale, when storage or write throughput exceeds a single machine's capacity, we partition the database. For a URL shortener, hashing the <code className={styles.inlineCode}>short_code</code> and distributing records across multiple database nodes is the standard approach.
          </li>
        </ul>
      </div>

      <div className={styles.section}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Phase 1: Startup</h4>
            <p className={styles.secondaryText}>Single App Server, Single Database. Fast iteration, easy deployments, low cost.</p>
          </div>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Phase 2: Growth</h4>
            <p className={styles.secondaryText}>Load Balancer, Multiple App Servers, Redis Cache introduced to offload DB reads.</p>
          </div>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>Phase 3: Scale</h4>
            <p className={styles.secondaryText}>Database Read Replicas, Multi-AZ deployment, automated scaling groups.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
