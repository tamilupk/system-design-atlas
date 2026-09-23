import { StepContent, StepSection, Paragraph, Callout, TradeoffTable } from '@/components/lesson/StepComponents';

export function TradeoffsStep() {
  return <StepContent>
    <StepSection title="Make choices conditional">
      <TradeoffTable title="Architecture review" items={[
        {aspect:'WebSocket vs polling',pros:'WebSocket avoids repeated polling for active sessions.',cons:'Long-lived state, reconnect storms, and slow consumers; polling can win for low-frequency clients.'},
        {aspect:'Conversation owner vs active-active',pros:'One owner gives simple canonical order and membership serialization.',cons:'Cross-region routing and partition unavailability; active-active needs explicit conflict semantics.'},
        {aspect:'Canonical log vs per-recipient copies',pros:'One message body reduces storage amplification.',cons:'Delivery needs independent tracking; recipient copies can simplify inbox reads at higher write cost.'},
        {aspect:'Presence cache vs durable message cache',pros:'Presence tolerates expiration and unknown values.',cons:'Messages and authorization cannot rely on volatile hints; cached history needs deletion/version control.'},
        {aspect:'Regional sync vs async DR',pros:'Remote synchronous durability can cover regional loss in its quorum failure model.',cons:'Higher latency and reduced partition availability; async cannot promise zero regional RPO.'},
      ]} />
    </StepSection>
    <StepSection title="Security, retention, and the changed requirement">
      <Paragraph>Five-year retention was a capacity assumption, not permission to retain every message. Define deletion, backup expiry, and tenant policies. Tombstones invalidate live caches; compact message bodies while keeping the minimal retry/visibility metadata the contract needs. Search indexes, push queues, exports, and backups need explicit deletion treatment.</Paragraph>
      <Paragraph>If E2EE becomes required, servers store ciphertext and authenticated metadata. Ordering, outbox, and replay still apply, but server-side content search/moderation and key recovery change fundamentally. Device enrollment, key rotation on membership change, and verification are separate design work. TLS alone is not E2EE.</Paragraph>
      <Paragraph>Do not purchase all five-year storage as RAM. Using the earlier 730 TB logical history, hot/cold tiering may move old bodies to cheaper durable storage while keeping bounded recent history fast. A monthly cost model is provisioned GB × storage rate + egress GB × regional rate + node-hours × compute rate. Supply current rates and access patterns before claiming a dollar total.</Paragraph>
    </StepSection>
    <Callout label="Be your own critic">This design assumes small private groups, one canonical order, and permission to pause writes under uncertain authority. It does not establish production throughput, solve arbitrary broadcast rooms, or make asynchronous DR lossless. A strong review names these limits before the interviewer does.</Callout>
    <StepSection title="Decision memo exercise"><Paragraph>Write three sentences in Study Notes: the invariant you protect, the failure you sacrifice availability for, and the measurement that would change your design. Then change the requirement to “regional writes must remain available during a partition.” Explain which ordering/durability promise must change rather than adding a cache.</Paragraph></StepSection>
    <StepSection title="Why SQL here, and when would you replace it?">
      <TradeoffTable title="Storage follows the invariants" items={[
        {aspect:'Sharded transactional SQL',pros:'Co-located membership, retry identity, events, and outbox can commit atomically.',cons:'Hot-room serialization, index growth, resharding, and storage lifecycle need operational work.'},
        {aspect:'Wide-column history store',pros:'Conversation/time-bucket range access and large distributed history can fit well.',cons:'Do not assume the same multi-record transaction or uniqueness guarantees; isolate ordering and dedup authority explicitly.'},
        {aspect:'Durable log as acceptance authority',pros:'An ordered append can drive replayable message and inbox projections.',cons:'Authorization and idempotency must be safe at append; projection lag changes when history becomes readable.'},
      ]} />
      <Paragraph>For an attachment, reserve a scoped upload, upload to object storage, verify ownership/size/type and any required scan, then send a message referencing a stable attachment ID. Issue short-lived download authorization at read time. Reclaim abandoned uploads; a pending upload must not become a permanently broken accepted attachment. The media pipeline, E2EE key protocol, search ranking, federation, and calls each merit separate design work.</Paragraph>
    </StepSection>
  </StepContent>;
}
