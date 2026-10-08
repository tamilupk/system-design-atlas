import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, DecisionChallenge } from '@/components/lesson/StepComponents';
import { urlShortenerChallenges } from '../challenges';

export const ReliabilityStep: FC<StepComponentProps> = () => (
  <StepContent>
    <StepSection title="Failure budgets, not invented guarantees">
      <Paragraph>{"The target is regional service-side cache-hit p99 below 100 ms, not global end-user latency. Redis has an illustrative 20 ms timeout; the complete mapping lookup has a 200 ms budget including primary probe, replica replay wait, query, and fallback. All redirect work fits within a 300 ms overall deadline; this is not the create path’s reputation-check and commit budget. Do not add component p99 values to obtain an end-to-end p99. A write timeout may leave its commit outcome unknown."}</Paragraph>
      <Paragraph>{"99.99% availability in a 30-day month allows 4.32 minutes unavailable. Cache misses depend on the primary freshness probe and either replica or primary lookup; valid cache hits can continue within their validity bounds. There is no defensible “11 nines” database claim without a specified failure model and evidence."}</Paragraph>
    </StepSection>
    <StepSection title="Primary failure and acknowledged writes">
      <Paragraph>{"Configure synchronous durable copies across selected AZs for mapping commits and fence the old primary before promoting a candidate that contains acknowledged history. The async read replica drawn separately is not automatically eligible. Creation/edits fail or remain unknown until a writable authority is established; retries preserve operation identity."}</Paragraph>
      <Paragraph>{"Fresh Redis entries may serve redirects only within their original validity and expiry bounds. New misses cannot establish a primary replay barrier during a primary outage, so return 503 even if an async replica remains readable. On failover, fence the old primary, invalidate old leadership epochs, and never compare WAL positions from unrelated histories. Measure failover RTO with fault injection."}</Paragraph>
      <Paragraph>{"An asynchronous remote copy may lose acknowledged data. Freeze uncertain writes and recover history rather than silently reusing a missing alias. A cached destination cannot reconstruct owners, deletion state, and idempotency records."}</Paragraph>
    </StepSection>
    <StepSection title="Replica lag and read-after-create">
      <Paragraph>{"Replication lag is measured, not bounded by a universal 10–50 or 50–500 ms range. Cache warmup after create is optional. Replay-checked replica reads work for anonymous visitors as well as creators; primary confirmation resolves replica misses. The barrier also prevents stale positive fills after mutations committed before it. Synchronous durable receipt differs from replay visibility on a selected reader."}</Paragraph>
    </StepSection>
    <StepSection title="Cache outages and bounded fallback">
      <Paragraph>{"Cache errors use the same replay-checked replica lookup and bounded primary fallback, with per-process singleflight and fleet capacity limits. A fleet-wide cold start increases both replica reads and primary freshness probes; shed excess work rather than multiplying connections. A circuit breaker bounds failed cache work but does not guarantee seamless availability."}</Paragraph>

    </StepSection>
    <StepSection title="Disaster recovery is a different guarantee">
      <Paragraph>{"Use tested base backups plus continuous WAL archiving and restore drills. An illustrative archive RPO objective of five seconds means recent commits can be lost if all synchronous copies are destroyed before WAL reaches the archive. Monitor archive age and verify the objective under low traffic, failures, and backup corruption; it is not guaranteed by saying logs are streamed every second. Restore RTO depends on dataset size and replay work."}</Paragraph>
      <Paragraph>{"Recovery may intentionally stop before a corruption event and lose later transactions. Preserve off-site backups and reconcile against surviving operation records; separate this disaster boundary from single-AZ acknowledged-write durability."}</Paragraph>
    </StepSection>
    <StepSection title="Expiration and takedown are different clocks">
      <Paragraph>{"Both cache hits and freshness-checked database results check absolute expiry at the decision boundary; expired public links return 404. Scheduled expiry does not wait for a sweeper. Mutations use committed invalidation plus the original 30-second validity window. Monitor invalidation lag, replica replay waits, fallback rate, primary probe errors, and clock health. Immediate blocking requires a per-request safety authority."}</Paragraph>
    </StepSection>
<DecisionChallenge challenge={urlShortenerChallenges['replication-lag-race']!} />
<Paragraph>Sources: <a href="https://www.postgresql.org/docs/current/warm-standby.html" target="_blank" rel="noreferrer">PostgreSQL standby durability and replay</a>; <a href="https://www.postgresql.org/docs/current/continuous-archiving.html" target="_blank" rel="noreferrer">WAL archiving and PITR</a>.</Paragraph>
  </StepContent>
);
