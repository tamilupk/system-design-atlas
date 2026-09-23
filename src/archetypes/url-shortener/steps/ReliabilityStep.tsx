import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
import { urlShortenerChallenges } from '../challenges';
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
        <h3 className={styles.sectionTitle}>System Service Level Objectives (SLOs)</h3>
        <p className={styles.paragraph}>
          In senior interviews, failure discussions begin with explicit availability and latency boundaries:
        </p>
        <ul className={styles.list}>
          <li><strong>Redirect Latency SLA:</strong> p99 &lt; 15ms globally; p50 &lt; 2ms (served from edge cache or memory).</li>
          <li><strong>Availability Target:</strong> 99.99% ("four nines" = maximum 4.38 minutes downtime per month).</li>
          <li><strong>Data Durability:</strong> 99.999999999% (11 nines) — no committed short link is ever permanently lost.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>1. Primary Database Failure</h3>
        <p className={styles.paragraph}>
          <strong>Failure:</strong> Hardware failure, OS kernel panic, or network loss on the DB primary node.
        </p>
        <p className={styles.paragraph}>
          <strong>Behavior:</strong> Writes (POST /api/urls) fail with HTTP 503. However, <em>redirect reads continue uninterrupted</em> because app servers read from Redis and read replicas. The system gracefully degrades to read-only operation.
        </p>
        <p className={styles.paragraph}>
          <strong>Recovery:</strong> An automated consensus manager (e.g. Patroni, AWS RDS Multi-AZ) elects the most up-to-date read replica, promotes it to primary, and updates DNS/virtual IP. Recovery Time Objective (RTO) is 15–30 seconds.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>2. Read Replica Failure & Replication Lag</h3>
        <p className={styles.paragraph}>
          <strong>Replica Outage:</strong> If a read replica crashes, the database proxy/connection pool redistributes read queries across healthy surviving replicas.
        </p>
        <p className={styles.paragraph}>
          <strong>Replication Lag ("Read-Your-Own-Writes" Hazard):</strong> Asynchronous replication introduces a 50–500ms lag. If a user creates <code className={styles.inlineCode}>/launch</code> and immediately tests it, a cache miss hitting a lagging replica would return an erroneous 404!
        </p>
        <p className={styles.paragraph}>
          <strong>Mitigations:</strong>
        </p>
        <ul className={styles.list}>
          <li><strong>Write-Through Warmup:</strong> The app server populates Redis immediately upon successful creation.</li>
          <li><strong>Sticky Primary Reads:</strong> Newly created links route read attempts to the primary DB for the first 60 seconds.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>3. Redis Cluster Errors vs Total Failure</h3>
        <p className={styles.paragraph}>
          <strong>Transient Redis Timeouts:</strong> Cache calls must be bounded by a strict 50ms timeout. A slow or degraded Redis node must <em>never</em> tie up HTTP worker threads.
        </p>
        <p className={styles.paragraph}>
          <strong>Total Cache Outage & Thundering Herd:</strong> If the cache tier restarts empty, thousands of redirect requests miss simultaneously. To protect the database from crashing:
        </p>
        <ul className={styles.list}>
          <li><strong>Singleflight / Mutex Coalescing:</strong> If 500 requests for <code className={styles.inlineCode}>/viral</code> arrive simultaneously, only 1 request queries the DB; the other 499 await that exact result.</li>
          <li><strong>Adaptive Rate Limiting:</strong> Excess traffic exceeding measured DB capacity is throttled at the API Gateway with HTTP 429 rather than dropping the database cluster.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>4. Total Database Loss & Catastrophic Recovery</h3>
        <p className={styles.paragraph}>
          If both primary and replicas suffer catastrophic storage corruption, recovery relies on:
        </p>
        <ul className={styles.list}>
          <li><strong>Continuous WAL Archiving:</strong> Write-Ahead Logs are streamed every second to durable object storage (e.g. Amazon S3 / Google Cloud Storage).</li>
          <li><strong>Point-in-Time Recovery (PITR):</strong> Restore the latest daily base snapshot and replay WAL logs up to the second before corruption. Recovery Point Objective (RPO) &lt; 5 seconds.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>5. Distributed Link Expiration Sync</h3>
        <p className={styles.paragraph}>
          When a link has an explicit expiration timestamp, stale cached entries must not outlive the expiration date. 
          The cache TTL is computed as <code className={styles.inlineCode}>Math.min(DEFAULT_TTL, expiresAt - now)</code>. 
          When expired, lookups return HTTP 410 Gone or 404 Not Found consistently across all application layers.
        </p>
      </div>

      <div className={styles.section}>
        <DecisionChallenge challenge={urlShortenerChallenges['replication-lag-race']!} />
      </div>
    </div>
  );
};
