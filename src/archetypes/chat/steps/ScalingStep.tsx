import { StepContent, StepSection, Paragraph, Callout, TradeoffTable, ConceptLink } from '@/components/lesson/StepComponents';
import type { StepComponentProps } from '@/types/lesson';

export function ScalingStep({ onConceptClick }: StepComponentProps) {
  return <StepContent>
    <StepSection title="Scale sockets and conversation shards separately">
      <Paragraph>Assume 2M concurrent device connections and an initial load-test hypothesis of 50,000 sockets/gateway. At a 60% utilization target, usable capacity is 30,000 sockets/node: ceil(2M ÷ 30,000) = 67 gateways before failure-domain reserve. Across three equal AZs, 102 nodes (34/AZ) leave 68 × 30,000 = 2.04M capacity after losing one AZ. This estimate ignores skew; test memory, file descriptors, TLS CPU, and outbound bytes.</Paragraph>
      <Paragraph>A <ConceptLink conceptId="load-balancer" onConceptClick={onConceptClick}>connection-aware load balancer</ConceptLink> routes new sockets. Existing sockets stay on their gateway. Route conversation writes separately by a directory from conversation ID to virtual shard and owner epoch. Membership, messages, dedup identity, and outbox remain co-located.</Paragraph>
      <Paragraph>If a load test established 2,000 accepted sends/s per shard and we target 50% headroom, 23,148 ÷ 1,000 requires at least 24 primary shards. That capacity is a hypothetical input, not a benchmark. Replica I/O, history reads, skew, and failure reserve can raise the count.</Paragraph>
    </StepSection>
    <TradeoffTable title="Partition choices" items={[
      {aspect:'Conversation key',pros:'Ordered history and atomic message/outbox writes.',cons:'Hot conversations remain serial.'},
      {aspect:'Recipient key for delivery',pros:'Distributes fan-out work independently.',cons:'Retries and reordering require cursor repair.'},
      {aspect:'Time buckets within history',pros:'Bound partition size and retention operations.',cons:'Do not distribute current-room writes; cursors must cross buckets.'},
    ]} />
    <StepSection title="A gateway is stateful even when messages are elsewhere">
      <Paragraph>Do not autoscale solely on CPU. Idle sockets consume memory and file descriptors; a small number of busy sockets can dominate outbound bandwidth. Measure socket count, buffer occupancy, event-loop delay, handshake rate, and network throughput. Scale against whichever resource runs out first.</Paragraph>
      <Paragraph>Drain deployments in bounded batches: stop admitting new sockets, keep existing sessions alive for a grace period, and spread reconnects with jitter. The 102-node calculation assumes connections can be redistributed after an AZ loss; authentication, routing, and shard tiers must survive that burst too.</Paragraph>
    </StepSection>
    <Callout label="Migration probe">Move a virtual shard by catching up a replica, pausing/draining old writes, fencing its epoch, verifying the last committed position, then publishing new routing. During uncertainty return retryable failures. Copying rows and flipping a directory entry is insufficient.</Callout>
    <StepSection title="Capacity has a storage axis too">
      <Paragraph>The throughput estimate of 24 primary shards is not a five-year placement plan. The earlier 730 TB logical history × 1.5 row/index factor ÷ 24 = 45.6 TB per primary before headroom; three copies total about 136.9 TB per shard group. Choose shard sizes that can be backed up, restored, and moved within the recovery objective. Benchmark restore bandwidth as well as write throughput.</Paragraph>
      <Paragraph>Time buckets and cold storage bound active history, but moving old rows must preserve event cursors and retry identity. A UNIQUE constraint inside one bucket does not enforce uniqueness across all buckets. Keep dedup identity in an independently keyed authority, or design a supported retry window with an authenticated request epoch so an expired retry can be rejected rather than silently inserted into a new bucket.</Paragraph>
      <Paragraph>Hot reads need isolation too. Coalesce identical authorized history fetches, cap per-conversation concurrency, and version cached pages. Never share a private response across incompatible visibility scopes. <a href="https://discord.com/blog/how-discord-stores-trillions-of-messages">Discord’s storage case study</a> shows why replacing the database alone does not eliminate hot-partition problems.</Paragraph>
    </StepSection>
  </StepContent>;
}
