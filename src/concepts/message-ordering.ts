import type { SharedConcept } from '@/types/concept';

export const messageOrderingConcept: SharedConcept = {
  "id": "message-ordering",
  "title": "Message Ordering",
  "summary": "Define where an order exists and how readers recover it.",
  "explanation": "An ordering guarantee has a scope: a key, partition, or stream. A single authority can assign a sequence at commit. Ordering independent keys globally adds coordination that many applications do not need. Wall-clock timestamps alone do not establish a reliable order across machines.\n\nTransport order on one connection does not extend to concurrent writers or reconnects. Readers need durable positions, duplicate detection, and a recovery protocol. An ownership change also needs fencing: the persistence boundary must reject stale writers, including processes paused long enough to outlive a lease.",
  "role": "Makes concurrent events interpretable within an explicit consistency boundary.",
  "tradeoffs": [
    {
      "aspect": "Per-key authority",
      "pros": "Simple deterministic order and cursor reads.",
      "cons": "A hot key has a serial limit; failover requires fencing."
    },
    {
      "aspect": "Independent writers",
      "pros": "Local progress during a partition.",
      "cons": "Requires conflict semantics; cannot promise one immediate total order."
    }
  ],
  "failureModes": [
    "Clock skew reorders timestamp-sorted events.",
    "Expired owners keep writing unless storage enforces fencing.",
    "A reader advances past a missing event and loses it permanently."
  ],
  "relatedConceptIds": [
    "idempotency",
    "database-index"
  ]
};
