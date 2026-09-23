import { StepContent, StepSection, Paragraph, List, Callout } from '@/components/lesson/StepComponents';

export function RequirementsStep() {
  return <StepContent>
    <Callout label="Your opening interview move">A user sends “Meet at gate 7,” loses signal, and taps retry. Their laptop is online; the recipient’s phone is asleep. Define what each checkmark means before drawing a WebSocket.</Callout>
    <StepSection title="Agree on the product contract">
      <List>
        <li>Direct messages and private groups up to 100 members; multiple devices, conversation discovery, offline history, edits/deletes, delivery/read receipts, and approximate presence.</li>
        <li>Accepted = durably committed under the stated failure policy. Delivered = at least one recipient device persisted it. Read = a client reports it displayed; neither transport delivery nor push acceptance proves a human read.</li>
        <li>One canonical committed order per conversation; concurrent senders have no client-clock order guarantee. No global order across conversations.</li>
        <li>Attachments use object storage and signed references; binary media, search, calls, and end-to-end encryption implementation are outside this baseline. Revisit E2EE in trade-offs.</li>
      </List>
      <Paragraph>Proposed targets: same-region send acceptance p99 ≤ 200 ms and online delivery p99 ≤ 500 ms, measured separately. Aim for 99.95% monthly acceptance availability: a 30-day month × 24 × 60 × 0.0005 = 21.6 minutes of error budget. These are product targets, not measured capabilities. Regional partitions may consume this budget because safety takes priority.</Paragraph>
    </StepSection>
    <StepSection title="Capacity worksheet — illustrative, decimal units">
      <Paragraph>Assume 10M daily active users × 40 sends/day = 400M messages/day. Divide by 86,400 = 4,630 average sends/s; a 5× peak gives 23,148 sends/s. Model 1,000 bytes/message: 700 bytes text plus 300 bytes IDs, metadata, and envelope; attachment bytes are excluded.</Paragraph>
      <List>
        <li>History: 10M users × 20 page fetches/day ÷ 86,400 = 2,315 average queries/s; ×5 = 11,574 peak queries/s. At 50 messages/page this is about 579 MB/s of response payload at peak, before compression and framing.</li>
        <li>Live fan-out: assume 70% direct messages to 1 peer and 30% group messages to 9 peers: 0.7 × 1 + 0.3 × 9 = 3.4 peer recipients/send. At 1.2 online destination devices/peer, 23,148 × 3.4 × 1.2 ≈ 94,444 deliveries/s.</li>
        <li>Live payload egress ≈ 94.4 MB/s = 0.76 Gbit/s. Add the history estimate for ≈ 673 MB/s = 5.39 Gbit/s. Provision beyond this for TLS, retries, receipts, sender-device sync, and media; do not mistake payload arithmetic for NIC sizing.</li>
        <li>Storage: 400M × 1 KB = 400 GB/day. Three years × 365 days = 438 TB logical; five years = 730 TB. Assuming indexes/row overhead add 50% and three physical copies, five-year capacity = 730 × 1.5 × 3 = 3.285 PB before backups, outbox, and compaction headroom.</li>
        <li>Hot history hypothesis: 20% of the last day’s 400 GB serves 80% of history reads: 80 GB payload. At 2× cache overhead and two copies, budget 320 GB RAM. Validate this skew and window; 80/20 is an assumption, not a law.</li>
      </List>
    </StepSection>
    <Callout label="Staff-level probe">If average group size doubles, which terms change? Peer fan-out and receipt traffic grow; canonical message storage does not double. Ask for distributions and the busiest room, not only averages.</Callout>
    <StepSection title="Read the assumptions before trusting the answer">
      <Paragraph>The 1.2 online destination devices per peer is a traffic-weighted fan-out assumption, including peers with no online device; it is not an average across all registered users. The later 2M concurrent connections is a separate fleet assumption. Both must come from compatible traffic samples. Quiet/offline peers lower delivery work; a burst concentrated in large active groups raises it.</Paragraph>
      <Paragraph>The worksheet sizes original text messages. Membership changes, edits, reactions, receipts, event-log records, and indexes add writes and storage. Do not count a logical message as one physical I/O: its transaction updates several records, and WAL, replication, cleanup, and backups amplify that further. Binary media must have its own bandwidth and retention budget.</Paragraph>
      <Callout label="First answer checkpoint">In your own words: what survives one AZ failure, what may be lost in a regional disaster with asynchronous replication, and which latency target excludes offline devices? If those answers are unclear, the diagram is premature.</Callout>
    </StepSection>
  </StepContent>;
}
