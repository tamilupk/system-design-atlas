import { StepContent, StepSection, Paragraph, List, Callout, ConceptLink } from '@/components/lesson/StepComponents';
import type { StepComponentProps } from '@/types/lesson';

export function RecoveryStep({ onConceptClick }: StepComponentProps) {
  return <StepContent>
    <StepSection title="Close the history/live race">
      <List ordered>
        <li>Authenticate, recheck membership, register the new live route, and start a bounded buffer.</li>
        <li>Read a committed high-water mark H from the authoritative shard. Fetch authorized pages after the device’s last contiguous cursor through H.</li>
        <li>Merge pages and buffered arrivals by conversation/sequence. Deduplicate repeats. If 107 arrives before 106, fetch the gap instead of advancing past it.</li>
        <li>Periodically reconcile the durable head even when the socket looks healthy. A missed final event has no later event to reveal its gap.</li>
        <li>If the buffer overflows or the cursor predates retained history, return RESYNC_REQUIRED with a server-defined snapshot boundary. Never silently pretend the device is caught up.</li>
      </List>
      <Paragraph>Read from the primary or wait for the replica to reach the required commit position. A sender must not see its accepted message disappear on a lagging history replica. A <ConceptLink conceptId="cache" onConceptClick={onConceptClick}>presence cache</ConceptLink> is a hint; the durable cursor is the recovery authority.</Paragraph>
    </StepSection>
    <StepSection title="Bound the reconnect buffer">
      <Paragraph>Set an illustrative 64 KB per-socket outbound buffer. At 2M sockets the worst-case buffers alone consume 128 GB, before TLS and runtime overhead. At 1 KB/event, about 64 events fit before framing. Drop typing/presence first; when message delivery cannot keep up, close with a resync signal and fetch history later. Do not retain an unbounded queue in gateway RAM.</Paragraph>
      <Paragraph>History cache invalidation is separate from presence. Version immutable history pages or use short TTLs; a stale refill after deletion must not resurrect content. Apply authoritative tombstone/version checks before serving cached bodies.</Paragraph>
      <Paragraph>Illustrative catch-up: a device missed 2,000 messages, pages contain 100 events, and each sequential page takes an assumed 100 ms. Twenty pages need at least 2 seconds before parsing and retry overhead. If new events arrive faster than catch-up can apply them, reconnect will never converge without a snapshot or reduced live workload.</Paragraph>

    </StepSection>
    <Callout label="Probe">What if the reconnect buffer and history page both contain 105? One local upsert, one displayed message. What if no 106 ever arrives? Reconcile against the durable head and visibility policy; do not wait forever based solely on socket traffic.</Callout>
    <StepSection title="How does a fresh device discover its conversations?">
      <Paragraph>A per-conversation cursor cannot reveal a room the device has never seen. Add a user-scoped conversation directory and durable change feed, keyed by user and carrying an opaque sync token. GET /sync?since=token returns changed conversation IDs, membership changes, head positions, and read-state updates; the client then fetches the relevant conversation events. It is a discovery index, not a second canonical message store. Its storage is partitioned by user; the diagram groups projection workers under Relay / fan-out and omits this separate projection store.</Paragraph>
      <Paragraph>Update that feed asynchronously from the conversation outbox with deduplication. Apply per-room revisions monotonically so a delayed join cannot undo a newer leave. A user-feed position is local to that user; it does not establish global message order. New devices receive a paginated membership snapshot with a continuation boundary, then changes after that boundary. Expired tokens trigger a fresh snapshot. Monitor projection lag and repair missed entries from authoritative membership/history; simply polling known rooms cannot repair a missing room.</Paragraph>
      <Paragraph>For a device in 500 rooms, fetching every room at the assumed 100 ms/page would take 50 seconds sequentially even for one page each. Bound concurrency and prioritize the open conversation; use the change feed to avoid checking hundreds of unchanged rooms. Do not advance a sync token until its batch is locally applied.</Paragraph>
    </StepSection>
  </StepContent>;
}
