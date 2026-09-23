import type { SharedConcept } from '@/types/concept';

export const transactionalOutboxConcept: SharedConcept = {
  "id": "transactional-outbox",
  "title": "Transactional Outbox",
  "summary": "Make a state change and its publication obligation atomic.",
  "explanation": "A database transaction writes both application state and an outbox record. A relay publishes committed outbox records to downstream consumers. This closes the failure window in a non-atomic database-plus-broker dual write. The transaction must cover both records in the same atomic boundary.\n\nPublication is generally at least once: a relay may crash after publishing but before recording completion. Consumers therefore need stable event identity and idempotent effects. Outbox ordering, retention, retries, and backlog limits are explicit parts of the design; the pattern does not by itself guarantee exactly-once external effects.",
  "role": "Bridges transactional state and asynchronous work without an unsafe dual write.",
  "tradeoffs": [
    {
      "aspect": "Outbox relay",
      "pros": "Durable obligation survives service crashes.",
      "cons": "Extra storage, cleanup, lag monitoring, and duplicate handling."
    },
    {
      "aspect": "Synchronous downstream call",
      "pros": "Immediate feedback when successful.",
      "cons": "Independent systems cannot be committed atomically by ordinary calls."
    }
  ],
  "failureModes": [
    "Relay outage grows backlog until capacity is exhausted.",
    "Duplicate publication repeats non-idempotent effects.",
    "Parallel relays can reorder records without an ordering strategy."
  ],
  "relatedConceptIds": [
    "idempotency",
    "message-ordering"
  ]
};
