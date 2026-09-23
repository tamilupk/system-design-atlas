import { StepContent, StepSection, Paragraph, Callout, CodeBlock, ConceptLink } from '@/components/lesson/StepComponents';
import type { StepComponentProps } from '@/types/lesson';

export function ProtocolStep({ onConceptClick }: StepComponentProps) {
  return <StepContent>
    <StepSection title="An application protocol over WebSocket">
      <Paragraph>TLS WebSockets provide a bidirectional connection, not durable delivery across reconnects. Authenticate the handshake, validate browser origins, bound frame size, and reauthorize every send/history request. Derive sender identity from credentials, never the payload. Rate-limit by user and conversation.</Paragraph>
      <CodeBlock title="Wire contract (pseudocode)" language="text" code={`SEND {conversation_id, client_message_id, body, client_created_at}
ACCEPTED {client_message_id, message_id, seq, committed_at}
MESSAGE {conversation_id, message_id, seq, sender_id, body}
RESUME {conversation_id, after_seq, device_id}
DELIVERED {conversation_id, device_id, through_seq}
READ {conversation_id, through_seq}
ERROR {code: "FORBIDDEN|CONFLICT|RETRY_LATER", retry_after_ms}`} />
      <Paragraph>HTTPS fallback: POST /conversations/:id/messages returns 201 for a new commit, 200 for an identical retry, 409 for ID/payload mismatch, 403 for denied access, 429 for quotas, and 503 for unavailable authority. A timeout is an unknown outcome; retry the same ID with bounded exponential backoff and jitter. GET /conversations/:id/events?after_seq=104&amp;limit=100 returns authorized ascending events and a server continuation cursor. Fetch the rendered message timeline separately with a before_seq keyset cursor for scrolling backward. Forward synchronization and backward history browsing solve different problems.</Paragraph>
    </StepSection>
    <StepSection title="Keys encode the guarantees">
      <CodeBlock title="Logical schema — co-located on conversation shard" language="sql" code={`conversations(conversation_id PRIMARY KEY, next_seq, owner_epoch)
members(conversation_id, user_id, membership_epoch, joined_seq, left_seq, role)
messages(conversation_id, seq, message_id, sender_id,
         client_message_id, payload_hash, body, committed_at,
         PRIMARY KEY(conversation_id, seq),
         UNIQUE(conversation_id, sender_id, client_message_id))
events(conversation_id, seq, event_id, type, target_message_id, payload,
       PRIMARY KEY(conversation_id, seq))
outbox(conversation_id, seq, event_id UNIQUE, published_at)
device_receipts(conversation_id, user_id, device_id,
                delivered_through, PRIMARY KEY(conversation_id,user_id,device_id))
user_reads(conversation_id, user_id, read_through,
           PRIMARY KEY(conversation_id,user_id))`} />
      <Paragraph>This is a schema sketch, not executable DDL. A message row is the current rendered state; an event is a durable change at a conversation position. A create shares its sequence with the new message; later edits and deletes get new event positions. Keep membership intervals across leave/rejoin cycles rather than overwriting the old interval. The <ConceptLink conceptId="database-index" onConceptClick={onConceptClick}>history index</ConceptLink> supports keyset pagination. For <ConceptLink conceptId="idempotency" onConceptClick={onConceptClick}>idempotency</ConceptLink>, persist a random client ID locally before sending; compare a canonical payload hash on retries. Keep retry identity as long as retries are supported, including tombstones after deletion. Expired identities require an explicit error or a versioned retention contract.</Paragraph>
      <Paragraph>Membership changes serialize with sends. Our policy denies removed users future reads/delivery; join history begins at joined_seq unless the product grants earlier access. Check again before queued delivery. Revocation cannot erase bytes already delivered to a device.</Paragraph>
    </StepSection>
    <Callout label="Probe: can a receipt skip a gap?">No. A device advances delivered_through only after every visible event through that position is durably applied. Server-authorized tombstones or skipped ranges let it advance past deleted or inaccessible events. Read receipts are monotonic max updates, authenticated and bounded by authorized history.</Callout>
    <StepSection title="A socket can outlive its credentials">
      <Paragraph>Revalidate long-lived sessions and define token refresh, expiry, and logout behavior. Revoke affected sockets or reject further operations when authority expires. Never put long-lived secrets into logged URLs. Validate payload schemas and lengths, render message bodies safely, and bound connection, send, and recipient-fan-out rates. A valid handshake does not authorize every future conversation operation.</Paragraph>
      <Paragraph><a href="https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html">OWASP’s WebSocket guidance</a> covers session lifetime, origin checks, and message-level authorization. Blocking/reporting, spam controls, and notification preferences are product policies that must be enforced at the relevant send/delivery boundary, not inferred from presence.</Paragraph>
    </StepSection>
  </StepContent>;
}
