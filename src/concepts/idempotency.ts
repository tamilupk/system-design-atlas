import type { SharedConcept } from '@/types/concept';

export const idempotencyConcept: SharedConcept = {
  id: 'idempotency',
  title: 'Idempotency',
  summary: 'A property of an operation where performing it multiple times produces the same result as performing it once.',
  explanation: 'An idempotent operation can be safely retried without changing the result beyond the initial application. This property is essential in distributed systems where network failures, timeouts, and retries are common.\n\nHTTP GET, PUT, and DELETE are designed to be idempotent by specification. POST is not inherently idempotent, which is why APIs often use idempotency keys: a unique token sent with a request that lets the server recognize and deduplicate retries.\n\nImplementing idempotency typically involves storing a record of processed request identifiers and returning the cached response for duplicates rather than re-executing the operation.',
  role: 'Ensures operations are safe to retry in the face of network failures and timeouts.',
  tradeoffs: [
    { aspect: 'Reliability', pros: 'Clients can safely retry failed requests without causing duplicates', cons: 'Requires server-side storage and lookup of idempotency keys' },
    { aspect: 'Complexity', pros: 'Simplifies client-side retry logic', cons: 'Server must handle key storage, expiration, and concurrent requests with the same key' },
    { aspect: 'Performance', pros: 'Duplicate requests return cached results instantly', cons: 'Additional key lookup on every request; storage for idempotency records' },
  ],
  failureModes: [
    'Idempotency key store becomes unavailable, forcing a choice between rejecting requests or risking duplicates',
    'Keys expire too early, allowing duplicate processing of slow retries',
    'Different request bodies sent with the same idempotency key cause ambiguous behavior',
  ],
  relatedConceptIds: ['cache', 'load-balancer'],
};
