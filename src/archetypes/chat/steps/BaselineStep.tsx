import { StepContent, StepSection, Paragraph, List, Callout, TradeoffTable, ConceptLink } from '@/components/lesson/StepComponents';
import type { StepComponentProps } from '@/types/lesson';

export function BaselineStep({ onConceptClick }: StepComponentProps) {
  return <StepContent>
    <StepSection title="Start with one service and one database">
      <Paragraph>A chat process owns sockets, authorizes sends, and executes a transaction in PostgreSQL. Lock the conversation row, validate membership, check retry identity, allocate the next sequence, and insert the message and its create event. Commit before acknowledging or pushing. A unique constraint backs up the application check.</Paragraph>
      <Paragraph>Use durable WAL and a configured synchronous standby in another availability zone before claiming survival of a single-AZ failure. Replication settings and a safe promotion procedure are part of the guarantee. One standalone database cannot honestly make that promise.</Paragraph>
      <Paragraph>The baseline has no broker and no presence cache: a local socket map is enough to start. It is intentionally bounded by one process and one database. Load-test the actual transaction and connection workload before deciding its operating limit.</Paragraph>
    </StepSection>
    <StepSection title="Pause the movie at the crash window">
      <List ordered>
        <li>The message transaction commits sequence 105.</li>
        <li>The sender receives ACCEPTED.</li>
        <li>The service crashes before reaching the recipient’s socket.</li>
      </List>
      <Paragraph>The message survives, but the recipient may wait indefinitely for a live notification. Reconnect/history fixes eventual recovery; an online device with a healthy socket elsewhere also needs a delivery mechanism or periodic reconciliation.</Paragraph>
      <Paragraph>Add a <ConceptLink conceptId="transactional-outbox" onConceptClick={onConceptClick}>transactional outbox</ConceptLink> in the same message transaction. A relay retries committed delivery obligations. If it crashes after publishing but before checkpointing, publication repeats. Recipients and downstream workers must deduplicate by stable event identity.</Paragraph>
    </StepSection>
    <TradeoffTable title="Why evolve this baseline?" items={[
      {aspect:'Direct push after commit',pros:'Few components; excellent prototype boundary.',cons:'A crash loses the live-delivery attempt; history polling must repair it.'},
      {aspect:'Database plus outbox',pros:'Commit and delivery obligation are atomic.',cons:'Relay lag, cleanup, and duplicates become operational work.'},
      {aspect:'Independent DB and broker writes',pros:'Looks simple in a happy-path diagram.',cons:'Either write can succeed alone; reversing their order does not close the failure window.'},
    ]} />
    <Callout label="Interview probe">What happens when the relay is down for an hour? Preserve messages, show delivery delay, cap backlog growth, and stop accepting new work before storage exhaustion. An outbox makes work durable; it does not create infinite capacity.</Callout>
  </StepContent>;
}
