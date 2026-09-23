import { StepContent, StepSection, Paragraph, Callout, CodeBlock, ConceptLink, DecisionChallenge } from '@/components/lesson/StepComponents';
import type { StepComponentProps } from '@/types/lesson';
import { chatChallenges } from '../challenges';

export function OrderingStep({ onConceptClick }: StepComponentProps) {
  return <StepContent>
    <StepSection title="Choose one serialization boundary">
      <Paragraph>Route a conversation to one logical owner. Its database transaction defines the canonical order; gateway arrival time and phone timestamps do not. Two devices can submit concurrently: whichever transaction commits first receives the earlier sequence. The product may retain client timestamps for display, never for authority.</Paragraph>
      <CodeBlock title="Send transaction (pseudocode)" language="text" code={`BEGIN
  lock conversation row; verify current owner epoch
  authorize authenticated sender against current membership
  existing = lookup(conversation, sender, client_message_id)
  if existing:
    reject if canonical payload hash differs
    return existing result after ending transaction
  seq = conversation.next_seq
  insert message(conversation, seq, retry_identity, payload)
  insert event(conversation, seq, type = CREATE, target = message_id)
  insert outbox(event_id = conversation + ':' + seq)
  increment conversation.next_seq
COMMIT with configured synchronous durability
return ACCEPTED(seq, message_id)
// Timeout after COMMIT? Retry original identity; do not guess.`} />
      <Paragraph>Updating next_seq inside the same transaction avoids allocating permanent holes on rollback. Deletion still needs tombstones. A separate database sequence can have gaps, so never assume contiguous integers unless the storage contract provides them. Storage-enforced fencing rejects old owner epochs; an application-side lease check alone has a pause-after-check race.</Paragraph>
      <Paragraph><ConceptLink conceptId="message-ordering" onConceptClick={onConceptClick}>Ordering</ConceptLink> and <ConceptLink conceptId="idempotency" onConceptClick={onConceptClick}>deduplication</ConceptLink> solve different problems. Relays may reorder or repeat events. Partition relay work by conversation where practical, and let devices buffer bounded gaps and fetch missing history. The UI displays canonical order after reconciliation.</Paragraph>
    </StepSection>
    <Callout label="Predict before choosing">Sequence 105 exists, the ACK is lost, and two retries arrive. How many rows and how many delivery events can exist? Commit to an answer, then evaluate the alternatives below.</Callout>
    <DecisionChallenge challenge={chatChallenges['lost-ack']!} />
    <Callout label="Change the assumption">If the client loses its durable pending queue and generates a new ID, the server cannot reliably infer whether identical text is a retry or an intentional second message. Exactly-once user intent is stronger than unique stored operations.</Callout>
    <StepSection title="Edits and deletes must travel through time">
      <Paragraph>You received message 105 and disconnected at cursor 110. Its author edits it while you are offline. Updating only the row at 105 means a query after 110 never discovers the edit. Instead append EDIT at 111, targeting the stable message ID from 105; update the rendered row and outbox in that same transaction. DELETE at 112 carries a tombstone. Every persistent change consumes a new event position; the device applies changes in order.</Paragraph>
      <Paragraph>Keep the original SEND payload hash immutable for retry validation; editing the rendered body must not change what the original request meant. Authorize the actor and target on the conversation shard. For competing edits, choose a policy: last committed authorized edit wins, or reject a stale expected revision with 409. Here deletion wins over later edits; an old replay cannot resurrect a deleted body. Retention erases protected content from historical edit payloads too, keeping only the minimal synchronization tombstone allowed by policy.</Paragraph>
      <Callout label="Predict the replay"><details><summary>DELETE 112 arrives before EDIT 111. What may the client show?</summary><Paragraph>It must not move its contiguous cursor past the gap. Buffer or fetch 111, then apply 112. An already-known deletion prevents an older edit from restoring the body; after reconciliation the record remains deleted. A receipt for 112 means the applicable event prefix was processed, not that the deleted text was read.</Paragraph></details></Callout>
    </StepSection>
  </StepContent>;
}
