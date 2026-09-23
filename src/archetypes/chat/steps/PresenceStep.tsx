import { StepContent, StepSection, Paragraph, List, Callout, CodeBlock } from '@/components/lesson/StepComponents';

export function PresenceStep() {
  return <StepContent>
    <StepSection title="Reconnect is the normal path">
      <Paragraph>A phone moves between networks. The old socket may appear alive while a new socket connects elsewhere. Give every session a generation; route entries include user, device, gateway, generation, and TTL. A late disconnect removes only its own generation, never the replacement route.</Paragraph>
      <Paragraph>Illustrative policy: heartbeat every 30 seconds, TTL 90 seconds = three missed refreshes. With 2M connected devices this is 2M ÷ 30 ≈ 66,667 heartbeat refreshes/s. Gateway batching or lease aggregation may reduce datastore work. “Online” means recently observed, not guaranteed reachable; cache failure should show unknown presence.</Paragraph>
    </StepSection>
    <StepSection title="The stale disconnect experiment">
      <Paragraph>Device D connects to gateway A with generation 7, then reconnects to B with generation 8. A’s delayed cleanup arrives last. Predict the outcome of an unconditional delete: it erases the healthy route to B. The cleanup must compare the stored generation atomically.</Paragraph>
      <CodeBlock title="Route lease pseudocode" language="text" code={`install(user, device, new_generation, gateway, expires_at)
refresh only if stored_generation == my_generation
delete only if stored_generation == my_generation
// Route authority allocates or CAS-installs generations.
// A reconnect receives a new generation; a refresh never replaces it.`} />
      <Paragraph>At user level, presence aggregates unexpired device leases. One phone disconnecting must not mark a still-connected laptop offline. Expiration is an approximation: scheduler pauses, delayed heartbeats, and network partitions can all produce false offline signals. Presence must not authorize sends or reads.</Paragraph>
    </StepSection>
    <StepSection title="Receipts are a different kind of state">
      <List>
        <li>Persist a delivery receipt only after the device has applied all visible events through its cursor. A missing event prevents advancement unless an authorized skip or tombstone covers it.</li>
        <li>Aggregate user delivery as the maximum contiguous device cursor when the product defines delivered as “at least one device.” Do not take the minimum and wait forever for an abandoned device.</li>
        <li>Read is an explicit client signal. Apply max(old, reported) only after checking identity, membership, and an authorized upper bound; retries must never move the cursor backward.</li>
        <li>Push-provider acceptance is only acceptance of a wake-up hint. Sender-device synchronization and recipient delivery are distinct destinations.</li>
      </List>
      <Paragraph>Illustrative receipt budget: the earlier 94,444 live deliveries/s could create as many delivery receipt events if acknowledged individually. If a busy device batches 20 contiguous events per update, that subset needs one twentieth as many updates; sparse conversations will not achieve this reduction. Limit both flush interval and batch size so lower traffic does not wait indefinitely.</Paragraph>
    </StepSection>
    <Paragraph>Respect receipt and presence privacy settings independently. Avoid plaintext push previews when prohibited, and synchronize the sender’s other devices without treating that as recipient delivery.</Paragraph>
    <Callout label="Decide, then reveal">A phone reports through_seq=107 while its laptop reports 104. <details><summary>What does the sender see?</summary><Paragraph>Delivered through 107 under our at-least-one-device definition. The laptop still resumes from its own cursor 104. A user-level aggregate must not overwrite a lagging device’s recovery position.</Paragraph></details></Callout>
    <StepSection title="Group receipts and unread badges need a definition">
      <Paragraph>The max-across-devices rule aggregates one recipient user only. In a group, keep separate user cursors and expose “delivered to 8 of 9 eligible peers” or an explicitly defined all-recipients state. For all-recipients delivery, use the minimum across that message’s eligible user cursors, not the maximum across the entire group. Define how later joins, departures, and privacy opt-outs affect the denominator.</Paragraph>
      <Paragraph>Unread count is not head_seq minus read_through: event positions also include edits, deletions, membership changes, and the user’s own messages. Maintain a repairable projection of visible unread creates or compute it from history, with explicit policies for mentions, deletion, and mark-unread. Read position, delivered position, and a personal mark-unread bookmark are different state.</Paragraph>
      <Paragraph>Publish presence only to authorized interested viewers and coalesce typing hints with short expiry. For background mobile devices, use push as a wake-up hint and fetch durable state on resume. Push can be delayed, collapsed, or lost; an online hint can be stale. Fall back based on missing delivery evidence, obey mute settings, and avoid treating notification-provider acceptance as message delivery. <a href="https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types">FCM documents collapsible sync hints and queue limits</a>.</Paragraph>
    </StepSection>
  </StepContent>;
}
