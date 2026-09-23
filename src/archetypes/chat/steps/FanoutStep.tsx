import { StepContent, StepSection, Paragraph, Callout, TradeoffTable } from '@/components/lesson/StepComponents';

export function FanoutStep() {
  return <StepContent>
    <StepSection title="A room is not an average">
      <Paragraph>Suppose one room receives 5,000 sends/s. A serialized transaction taking an assumed 2 ms sustains at most 1 ÷ 0.002 = 500 sends/s without batching: ten times too little. Hashing conversation IDs across more shards cannot split this one ordering key. Batch commits, dedicate resources, throttle, or renegotiate ordering/room limits.</Paragraph>
      <Paragraph>A 100-member room has 99 peers: 5,000 × 99 × 1.2 online devices × 1 KB = 594 MB/s of live payload for that room alone. Split fan-out by recipient/gateway partitions while retaining one canonical write stream. Queue partitions and per-tenant budgets isolate the blast radius.</Paragraph>
      <Paragraph>Keep a single canonical message copy and fan out lightweight references/events. Small groups can use push; a million-member broadcast needs hierarchical fan-out, pull cursors, and relaxed per-recipient receipts. It is a different workload from this chapter’s 100-member limit.</Paragraph>
    </StepSection>
    <StepSection title="One order, many independent delivery workers">
      <Paragraph>Commit one ordered event, then partition delivery tasks by recipient ranges or destination gateway. A task carries conversation, sequence, recipient range, and a stable identity. Workers recheck membership, resolve current routes, and tolerate repeated processing. Task completion does not imply that every recipient device persisted the message; receipt tracking remains separate.</Paragraph>
      <Paragraph>Isolate queues and concurrency budgets by tenant or room class. A hot room must not consume every worker while small conversations wait. Record both oldest task age and delivery lag per class; aggregate p99 can hide starvation in a small tenant.</Paragraph>
    </StepSection>
    <TradeoffTable title="Choose the fan-out policy for the audience" items={[
      {aspect:'Push to every online device',pros:'Prompt delivery for bounded private groups.',cons:'Work grows with online recipients; reconnects and retries amplify it.'},
      {aspect:'Push a head-change hint, pull history',pros:'Coalesces bursts and lets clients pace reads.',cons:'Adds a fetch and makes history capacity critical; missed hints need reconciliation.'},
      {aspect:'Hierarchical broadcast',pros:'Shares work across gateway or regional branches.',cons:'More routing and repair machinery; not justified for every small group.'},
    ]} />
    <Callout label="Counterfactual exercise">The interviewer raises the room limit from 100 to one million. At the same 5,000 sends/s and 1.2 devices per peer, naive fan-out approaches 6 billion deliveries/s. Do not extrapolate a private-group design blindly: cap publishing rate, aggregate hints, reconsider receipts, and negotiate what “real time” means for inactive viewers.</Callout>
    <StepSection title="Batching has a latency price">
      <Paragraph>If a commit batch holds up to 20 messages and the serialized transaction still takes an assumed 2 ms, the idealized ceiling becomes 20 ÷ 0.002 = 10,000 messages/s. This is an upper-bound thought experiment: larger writes, replication, and locks may increase transaction time. Add a maximum wait deadline so a quiet room does not stall waiting for a full batch. Validate fairness and end-to-end tail latency under mixed hot and quiet rooms.</Paragraph>
    </StepSection>
    <StepSection title="Map the logical fan-out to actual connections">
      <Paragraph>Resolve recipients to interested gateway sessions and send one event per destination gateway when several recipients share it; that gateway fans out locally. This saves repeated internal payloads, not the final device deliveries. A stale subscription can cause a missed live event, so history and periodic reconciliation still matter. Membership checks must prevent stale subscriptions from exposing a removed user’s future content.</Paragraph>
      <Paragraph><a href="https://slack.engineering/real-time-messaging/">Slack’s real-time messaging design</a> uses channel servers and subscribed gateway servers, and treats transient events separately. This supports the separation of responsibilities; it is not evidence that our SQL owner, durability contract, or illustrative capacity matches Slack’s implementation.</Paragraph>
    </StepSection>
  </StepContent>;
}
