import type { ConceptContext } from '@/types/concept';

export const urlShortenerConceptContext: ConceptContext = {
  cache: {
    conceptId: 'cache',
    chapterRole: 'Caches redirect lookups (short_code → long_url) to avoid database queries on every redirect request. Most URL shorteners have a heavily read-skewed workload, making caching particularly effective.',
    exampleData: `Cache key: "url:abc123"\nCache value: "https://example.com/very/long/path"\nTTL: 24 hours\n\nPopular links may be accessed thousands of times per second.\nA 95% cache hit ratio reduces database reads from 10,000/s to 500/s.`,
    specificConsiderations: [
      'URL mappings are immutable in most designs, simplifying cache invalidation.',
      'TTL should balance freshness with database load — 24h is common for stable mappings.',
      'Cache warming for known popular links can prevent cold-start miss storms.',
      'If links can be deleted or expired, the cache must be invalidated on those events.',
      'A cache-aside (lazy loading) pattern works well because not all short codes are frequently accessed.',
    ],
  },
  'database-index': {
    conceptId: 'database-index',
    chapterRole: 'A unique index on the short_code column ensures fast lookups for redirects and prevents duplicate short codes during creation.',
    exampleData: `CREATE UNIQUE INDEX idx_short_code ON urls(short_code);\n\nLookup: SELECT long_url FROM urls WHERE short_code = 'abc123';\nThis query uses the index for O(log n) lookup instead of scanning millions of rows.`,
    specificConsiderations: [
      'The unique index on short_code serves double duty: fast lookups and uniqueness enforcement.',
      'With random code generation, the unique index catches collisions at the database level.',
      'Consider a covering index including long_url to serve redirects entirely from the index.',
      'Write performance impact is minimal since URL creation is far less frequent than redirects.',
    ],
  },
  'load-balancer': {
    conceptId: 'load-balancer',
    chapterRole: 'Distributes incoming redirect and creation requests across multiple stateless app server instances, enabling horizontal scaling.',
    exampleData: `Round-robin distribution across app servers:\n  Request 1 → App Server 1\n  Request 2 → App Server 2\n  Request 3 → App Server 1\n\nHealth check: GET /health every 10s on each server.`,
    specificConsiderations: [
      'App servers are stateless, so any routing algorithm works (round-robin, least connections).',
      'No sticky sessions needed since there is no server-side session state.',
      'SSL termination at the load balancer simplifies certificate management.',
      'The load balancer becomes a component to monitor — use redundant LB pairs in production.',
    ],
  },
  idempotency: {
    conceptId: 'idempotency',
    chapterRole: 'Creating a short URL should ideally be idempotent — submitting the same long URL multiple times could return the same short code rather than creating duplicates.',
    exampleData: `First request:  POST /api/urls {"url": "https://example.com"} → {"short_code": "abc123"}\nRetry request: POST /api/urls {"url": "https://example.com"} → {"short_code": "abc123"} (same result)\n\nAlternatively, always create new codes and let clients manage deduplication.`,
    specificConsiderations: [
      'Decision: same URL → same code (content-addressed) vs. always new code (simpler, allows per-user analytics).',
      'Content-addressed approach requires an index on long_url, which may be expensive for long URLs.',
      'Random code generation with retry-on-collision is naturally idempotent at the database level via unique index.',
    ],
  },
};
