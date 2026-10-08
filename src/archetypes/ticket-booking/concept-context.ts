import type { ConceptContext } from '@/types/concept';

export const ticketBookingConceptContext: ConceptContext = {
  "idempotency": {
    "conceptId": "idempotency",
    "chapterRole": "Replay one operation without creating another hold or charge.",
    "exampleData": "UNIQUE(event_id, purchase_intent_id); UNIQUE(event_id, hold_id)",
    "specificConsiderations": [
      "Bind the key to a canonical request hash and persist its result atomically.",
      "A provider key supplements the local booking ledger; it does not replace it.",
      "After HTTP replay expiry, return 410 and resolve the durable purchase intent; a fresh key cannot create a second hold or booking for that intent."
    ]
  },
  "database-index": {
    "conceptId": "database-index",
    "chapterRole": "Make seat ownership and recovery scans explicit.",
    "exampleData": "PRIMARY KEY(event_id, seat_id); INDEX(state, expires_at, hold_id)",
    "specificConsiderations": [
      "One event and its booking records live on one shard in this design.",
      "Bound expiry scans and order all seat locks consistently.",
      "An index accelerates lookup; transactions enforce the invariant."
    ]
  },
  "cache": {
    "conceptId": "cache",
    "chapterRole": "Serve approximate availability without selling from cached data.",
    "exampleData": "event snapshot = {geometry_version, commit_watermark, generated_at, two_bit_status}; no buyer identity",
    "specificConsiderations": [
      "Versioned updates reject older invalidations or refreshes.",
      "Browser and CDN caches are distinct from an origin cache.",
      "Every hold revalidates inventory at the writer."
    ]
  },
  "load-balancer": {
    "conceptId": "load-balancer",
    "chapterRole": "Admit bounded demand and route it to the event owner.",
    "exampleData": "signed admission(event, principal, nonce, expiry)",
    "specificConsiderations": [
      "The ingress box represents a redundant fleet.",
      "Atomically bind each permit nonce to one operation; same-operation retries recover the claim. Pause if replay state is unavailable.",
      "Load balancing distributes requests, not ownership of the same seat."
    ]
  },
  "transactional-outbox": {
    "conceptId": "transactional-outbox",
    "chapterRole": "Persist payment and issuance obligations with booking transitions.",
    "exampleData": "booking transition + outbox(operation_id) in one transaction",
    "specificConsiderations": [
      "Workers may execute twice; deduplicate effects.",
      "Do not treat relay acknowledgement as payment success.",
      "Back off indexed due-work scans, reserve expiry/reconciliation capacity, and monitor oldest pending age against the absolute payment deadline."
    ]
  }
};
