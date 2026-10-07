import type { ConceptContext } from '@/types/concept';

export const ticketBookingConceptContext: ConceptContext = {
  "idempotency": {
    "conceptId": "idempotency",
    "chapterRole": "Replay one operation without creating another hold or charge.",
    "exampleData": "UNIQUE(event_id, principal_id, operation, key)",
    "specificConsiderations": [
      "Bind the key to a canonical request hash and persist its result atomically.",
      "A provider key supplements the local booking ledger; it does not replace it.",
      "After the supported retry window, reject expired operations instead of replaying them as new."
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
    "exampleData": "event snapshot = {version, seat_status}; no buyer identity",
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
      "Validate tokens on every mutation and prevent replay.",
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
      "Monitor oldest pending age and reconcile against provider state."
    ]
  }
};
