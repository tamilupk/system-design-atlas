import { StepContent, StepSection, Paragraph, Callout, TradeoffTable } from '@/components/lesson/StepComponents';

export function OperationsStep() {
  return <StepContent>
    <StepSection title="The relay stopped. Acceptance still looks green.">
      <Paragraph>Your send endpoint meets its latency target, but recipients report silence. Separate acceptance from delivery SLOs: a healthy commit path can hide a broken relay. Show accepted-but-pending delivery honestly and alert on the age of the oldest unpublished event, not only API success.</Paragraph>
    </StepSection>
    <TradeoffTable title="Failure drills and signals" items={[
      {aspect:'Split-brain / network partition',pros:'Fence at the storage authority; freeze writes without exclusive ownership.',cons:'Availability drops; timeout alone cannot authorize promotion.'},
      {aspect:'Replica lag',pros:'Primary reads or commit-position waits preserve read-your-writes.',cons:'Fallback load and longer history latency; monitor applied positions.'},
      {aspect:'Reconnect herd',pros:'Full jitter, staged gateway drains, admission budgets, and bounded retries.',cons:'Some devices reconnect later; monitor accept rate and authentication saturation.'},
      {aspect:'Relay outage',pros:'Durable outbox and replay preserve recoverability.',cons:'Monitor oldest event age and disk runway; reject sends before exhaustion.'},
      {aspect:'Presence/cache failure',pros:'Degrade to unknown presence and history synchronization.',cons:'More reads; stale routes require generation checks and authorization.'},
    ]} />
    <Paragraph>Backlog drill: 23,148 sends/s × 600 seconds of relay outage ≈ 13.89M events; at an assumed 200-byte reference this is 2.78 GB raw, excluding indexes/replicas. If restored workers process 50,000 events/s and arrivals remain 23,148/s, drain time = 13.89M ÷ (50,000 − 23,148) ≈ 517 seconds. Capacity at or below arrival rate never drains the queue.</Paragraph>
    <StepSection title="Recovery can cause the second outage">
      <Paragraph>Checkpoint only after the downstream delivery obligation is durable or recoverable under the chosen protocol. A crash before checkpointing replays work; a checkpoint before safe handoff can lose it. Deduplicate stable event identities, and retain canonical history as the final repair path.</Paragraph>
      <Paragraph>Use bounded retry budgets with exponential backoff and jitter. A poison event should be quarantined with an explicit repair record and alert. Decide whether that conversation pauses or devices receive a gap requiring history repair; silently skipping it while claiming complete delivery is unacceptable.</Paragraph>
      <Paragraph>Prioritize durable messages over typing indicators, cap history-recovery concurrency, and reserve capacity for small conversations. Admission thresholds should use measured storage growth and free-space runway. If incoming work exceeds sustainable processing, shed nonessential work and reject new sends before accepted data is endangered.</Paragraph>
    </StepSection>
    <Callout label="Runbook rehearsal">Kill a relay after it publishes but before it checkpoints. Predict duplicates, confirm one displayed message, and measure drain time after restart. Then reduce workers below arrival rate: explain why adding retry attempts makes the backlog worse.</Callout>
    <StepSection title="Observe user-visible correctness without logging the conversation">
      <Paragraph>Correlate client operation ID, committed event position, relay attempt, gateway session generation, and device receipt. Measure acceptance and online-delivery latency separately; exclude offline devices only under a documented SLO population rule. Track reconnect convergence time and user-feed projection lag, not just socket count.</Paragraph>
      <Paragraph>Use synthetic conversations to detect “accepted but never delivered,” duplicate application, and a missed final event. Keep private bodies, credentials, and signed attachment URLs out of logs. Restore a shard from backups and replay its retained log in a drill: replicas reproduce accidental deletion, so replication alone is not a recovery plan.</Paragraph>
    </StepSection>
  </StepContent>;
}
