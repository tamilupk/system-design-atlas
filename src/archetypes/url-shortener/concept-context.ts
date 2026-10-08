import type { ConceptContext } from '@/types/concept';

export const urlShortenerConceptContext: ConceptContext = {
  cache: {
    conceptId: 'cache',
    chapterRole: 'Cache internal mappings while every GET still passes through application validity checks.',
    exampleData: 'url:abc1234 → {long_url, state, version, expires_at_ms, valid_until_ms}\nInternal validity: 24–30 seconds, bounded by expiry.\nHTTP redirect: 302 + Cache-Control: no-store.\n20,000 requests/s at 95% hits → 1,000 mapping lookups/s, plus primary freshness probes and replica replay checks.',
    specificConsiderations: [
      'Scaled fills wait for replica replay of a primary WAL barrier, with bounded primary fallback; cache hits check absolute validity and expiry.',
      'Mutation outbox invalidation advances a per-code version floor; old fills cannot reset the freshness deadline.',
      'No browser/CDN redirect cache is included in the selected mutable-link design.',
      'Short freshness windows cost misses; memory estimates include keys, metadata, replication, and allocator overhead.',
    ],
  },
  'database-index': {
    conceptId: 'database-index',
    chapterRole: 'Enforce case-sensitive code uniqueness while supporting indexed redirect lookup.',
    exampleData: 'short_code VARCHAR(32) COLLATE "C" UNIQUE\n6B rows × illustrative 64 B/code-index entry = 384 GB before bloat.',
    specificConsiderations: [
      'Code uniqueness and request idempotency require different constraints.',
      'Random secondary-index insertion locality should be benchmarked at the actual 200/s peak create rate.',
      'Including long_url in a covering index duplicates variable-length destinations and can enlarge storage substantially.',
      'Hash routing preserves one owner for the same code; that owner’s unique index performs arbitration.',
    ],
  },
  'load-balancer': {
    conceptId: 'load-balancer',
    chapterRole: 'Redundant TLS ingress routes to app instances and can apply configured coarse flood controls.',
    exampleData: 'Client → ingress → app → ingress → client\nApp-owned quotas use separate replicated limiter state; no implicit API Gateway.',
    specificConsiderations: [
      'Global owner quotas are separate from coarse ingress IP limits.',
      'No sticky session is needed: anonymous visitors use replay-checked replica reads and primary fallback.',
      'Fleet database budgets must account for all app instances; local singleflight is not fleet-wide.',
      'No redirect caching at ingress; application state and expiry checks remain on both read paths.',
    ],
  },
  idempotency: {
    conceptId: 'idempotency',
    chapterRole: 'Recover one create operation after response loss without allocating another short code.',
    exampleData: 'UNIQUE(owner_id, idempotency_key) + payload_hash + result_code\nCommit request result with mapping; changed payload under same key → 409.',
    specificConsiderations: [
      'The same long URL may intentionally have different codes; URL hashing is not request deduplication.',
      'A generated-code collision retries allocation; a custom-alias conflict returns 409.',
      'Random generation plus a code UNIQUE index alone is not idempotent creation.',
      'After sharding, routing request identity and code identity requires a durable coordinator and recovery of unknown claims.',
    ],
  },
};
