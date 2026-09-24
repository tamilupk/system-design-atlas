import { StepContent, StepSection, Paragraph, List, Callout } from '@/components/lesson/StepComponents';

export function RecapStep() {
  return <StepContent>
    <StepSection title="Your five-minute reconstruction">
      <List ordered>
        <li>Define acceptance, delivery, read, conversation ordering, and the regional failure policy.</li>
        <li>Derive 23k peak sends/s, 94k live device deliveries/s, and the separate history/connection budgets from explicit assumptions.</li>
        <li>Persist retry identity on the client. Authorize and atomically commit sequence, message, and outbox on the conversation shard.</li>
        <li>ACK only the durable commit. Relay at least once; recipients deduplicate and repair gaps.</li>
        <li>Balance new connections at ingress; keep established sockets on their gateway. Separate this from conversation write ownership and recipient fan-out. Bound buffers; treat presence as disposable.</li>
        <li>Fence old owners and check replicated commit positions before promotion. Make async DR’s possible data loss explicit.</li>
      </List>
      <Paragraph>Read the diagram as fleets: redundant ingress proxies separate sender and recipient sockets to the gateway tier. The recipient’s handshake and receipt traffic are omitted; delivery uses its existing connection. Earlier diagrams collapse ingress to focus on persistence and recovery.</Paragraph>
    </StepSection>
    <StepSection title="Adversarial follow-ups — answer before revealing">
      <details><summary>“Can the load balancer move a busy live socket?”</summary><Paragraph>No. Balance new connections, then retain their gateway binding. To redistribute existing sessions, drain and reconnect with jitter, re-authenticate, and resume from durable cursors. A healthy new gateway does not inherit the old gateway’s socket buffers. Conversation-owner routing and fencing remain separate.</Paragraph></details>
      <details><summary>“WebSocket is ordered. Why do we need sequence numbers?”</summary><Paragraph>One connection’s transport ordering cannot unify concurrent senders, multiple devices, relays, and reconnects. Durable per-conversation positions define canonical order and support recovery.</Paragraph></details>
      <details><summary>“The recipient ACKed, then its app crashed. Was it delivered?”</summary><Paragraph>Only if ACK followed local durable persistence under the stated device contract. Server receipt durability is separate; retry receipts using monotonic max updates. A read receipt still cannot prove human comprehension.</Paragraph></details>
      <details><summary>“The sender was removed while a message was queued.”</summary><Paragraph>Serialize send authorization with membership updates, defining a clear before/after order. Recheck recipient authorization before delivery; already delivered bytes cannot be revoked. State whether queued prior sends remain visible.</Paragraph></details>
      <details><summary>“The old owner wakes up after failover.”</summary><Paragraph>The storage authority must reject its old epoch. A local lease or directory cache is not enough. Separate database primaries require an external fencing/promotion protocol, not two unrelated epoch counters.</Paragraph></details>
      <details><summary>“Can we advertise exactly-once delivery?”</summary><Paragraph>Say what is unique: one durable message per scoped retry identity, under its retention contract. Transport and outbox delivery may repeat. Idempotent local application creates one displayed record; it does not deduplicate arbitrary user intent.</Paragraph></details>
    </StepSection>
    <Callout label="Self-assessment">Senior: defend the keys, API, and capacity math. Staff: expose hot-key limits, failover safety, queue drain time, and product compromises. Principal: challenge the failure model, establish measurable rollout gates, and explain when this architecture should be replaced.</Callout>
    <StepSection title="Mechanism references">
      <Paragraph><a href="https://www.rfc-editor.org/rfc/rfc6455">RFC 6455</a> specifies the WebSocket transport; our durable replay protocol is an application design.</Paragraph>
      <Paragraph><a href="https://www.postgresql.org/docs/16/runtime-config-wal.html">PostgreSQL WAL and synchronous commit</a> distinguishes local flush, remote flush, and remote apply. Choose the configuration to match the claimed durability/read guarantee.</Paragraph>
      <Paragraph><a href="https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/">Amazon Builders’ Library: retry-safe APIs</a> explains explicit request identity. All workload sizes, latency budgets, and challenge outcomes here are illustrative design assumptions, not vendor benchmarks.</Paragraph>
    </StepSection>
    <StepSection title="One conversation, three surprises">
      <Callout label="Explain it without component names">A new laptop has never seen room R. Message 105 was edited at 111 and deleted at 112; its push hint was lost. <details><summary>How does the laptop reach the right state?</summary><Paragraph>Bootstrap the user’s membership snapshot and change-feed boundary to discover R. Fetch an authorized conversation snapshot/event prefix, merge changes through its committed head, and persist the cursor only after applying the batch. The deleted body stays absent. Push and live sockets speed discovery; neither replaces durable synchronization.</Paragraph></details></Callout>
      <Paragraph>Review <a href="https://spec.matrix.org/latest/client-server-api/">Matrix’s client-server specification</a> for a real protocol’s sync tokens, room state, receipts, and edit events. Our centralized sequence and visibility policy are deliberate scenario choices, not Matrix compatibility. No single lesson covers all chat products: an encrypted messenger, enterprise workspace, and massive public broadcast service need different contracts.</Paragraph>
    </StepSection>
  </StepContent>;
}
