import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import styles from './StepContent.module.css';

export const ReliabilityStep: FC<StepComponentProps> = () => {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Designing for Failure</h3>
        <p className={styles.paragraph}>
          A robust distributed system doesn't just scale; it expects and survives component failures. Let's walk through how our scaled architecture handles various failure scenarios.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Scenario 1: Database Outage</h3>
        <p className={styles.paragraph}>
          <strong>Impact:</strong> The primary database goes offline unexpectedly.
        </p>
        <p className={styles.paragraph}>
          <strong>Mitigation:</strong> Because we utilize aggressive caching, read requests (redirects) for popular URLs will continue serving directly from the cache without interruption. However, writes (creating new URLs) will fail. The system gracefully degrades to a "read-only" state. Meanwhile, automated monitoring detects the outage and initiates a failover to a standby replica.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Scenario 2: Cache Cluster Failure</h3>
        <p className={styles.paragraph}>
          <strong>Impact:</strong> The Redis cluster drops all connections, wiping out the cache.
        </p>
        <p className={styles.paragraph}>
          <strong>Mitigation:</strong> The application servers will treat this as continuous cache misses and route all traffic directly to the database. This causes a massive spike in DB reads, known as a <em>Thundering Herd</em>. To mitigate this, we implement circuit breakers and timeout handling in the application layer, potentially rate-limiting incoming requests to protect the database from crashing until the cache is restored.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Scenario 3: Network Partition</h3>
        <p className={styles.paragraph}>
          <strong>Impact:</strong> An availability zone goes down, splitting our application servers from our databases.
        </p>
        <p className={styles.paragraph}>
          <strong>Mitigation:</strong> We deploy our application and database clusters across multiple Availability Zones (AZs) or regions. The load balancer automatically detects unhealthy application servers in the partitioned AZ and reroutes traffic to healthy instances in other zones.
        </p>
      </div>
    </div>
  );
};
