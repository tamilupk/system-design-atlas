import { StepContent, StepSection, Paragraph, Callout, DecisionChallenge } from '@/components/lesson/StepComponents';
import { chatChallenges } from '../challenges';

export function ResilienceStep() {
  return <StepContent>
    <StepSection title="Failure policy is part of the API">
      <Paragraph>Within a region, acknowledge only after the configured synchronous AZ durability boundary. During promotion, fence the old primary and select a replica containing acknowledged commits. Synchronous replication does not itself choose a safe leader. A lost commit response remains ambiguous and must be resolved through the retry identity.</Paragraph>
      <Paragraph>For remote disaster recovery, this design initially uses asynchronous replication. With an illustrative 2-second lag at 5,000 sends/s, up to 10,000 accepted messages are missing remotely. Two seconds is a scenario input, not a maximum: a prolonged partition grows the exposure. Zero regional RPO requires a different acknowledgement policy, such as a properly configured inter-region consensus quorum that includes remote durability.</Paragraph>
      <Paragraph>Example latency budget, not a percentile prediction: 40 ms network + 10 ms gateway/auth + 20 ms queue/transaction + 5 ms AZ flush = 75 ms. Requiring an additional assumed 80 ms remote durable round trip gives 155 ms before tail effects. Measure end-to-end p99; adding component p99 values does not produce the system p99.</Paragraph>
    </StepSection>
    <StepSection title="Promotion is a protocol, not a timeout">
      <Paragraph>First stop admission for the affected shard. Establish authority through the control-plane quorum; if that quorum cannot be reached, remain unavailable. Fence the old writer at the persistence boundary, then compare the candidate replica’s durable position with the recovery point required by the acknowledgement contract.</Paragraph>
      <Paragraph>Only after recovering missing commits may a zero-data-loss policy publish new routing and accept retries. If the old region is destroyed and asynchronous replication omitted accepted data, no fencing algorithm can recreate those bytes. Recover from another durable copy, keep the shard unavailable, or explicitly change the loss policy. Never label a fast promotion as safe merely because the new epoch is larger.</Paragraph>
      <Paragraph>During a planned transfer, drain the old writer, replicate its final committed position, revoke its authority, and atomically publish the new owner. During an unplanned partition those proofs are harder; drills must keep the old process alive to expose stale-writer bugs.</Paragraph>
    </StepSection>
    <DecisionChallenge challenge={chatChallenges['partition-owner']!} />
    <Callout label="Operational acceptance">Track acceptance error/latency, commit ambiguity, delivery lag, oldest outbox age, gap repairs, replication lag, and per-room saturation. Drill gateway kill, relay replay, AZ loss, and a partition with the old owner still alive. Verify no acknowledged message disappears within the promised failure model.</Callout>
    <StepSection title="Name the availability cost precisely">
      <Paragraph>RPO is the data-loss window you permit; RTO is the restoration time you target. Neither is established by a two-second observed lag or a health-check timeout. If the sole synchronous AZ standby is unavailable, waiting preserves the acknowledgement contract but can stop writes. Silently switching to asynchronous commit changes that contract. Additional appropriately placed replicas and a tested promotion policy are capacity and correctness decisions.</Paragraph>
      <Paragraph><a href="https://www.postgresql.org/docs/16/warm-standby.html#SYNCHRONOUS-REPLICATION">PostgreSQL’s replication documentation</a> distinguishes durable standby acknowledgement from remote application and explains the availability cost when required standbys cannot respond. Database replication acknowledgement is not itself a leader-election or fencing protocol.</Paragraph>
      <Paragraph>If the product explicitly accepts regional data loss, invalidate the affected history lineage and require clients to reconcile against a new server-issued history generation. Reusing an old sequence for different content can otherwise make deduplication discard the wrong message. That is a different contract from the zero-loss challenge above, not its fallback implementation.</Paragraph>
    </StepSection>
  </StepContent>;
}
