import type { SharedConcept } from '@/types/concept';

export const cacheConcept: SharedConcept = {
  id: 'cache',
  title: 'Cache',
  summary: 'A high-speed data storage layer that stores a subset of data, typically transient, so that future requests for that data are served faster.',
  explanation: 'A cache sits between a data consumer and a data source, storing copies of frequently or recently accessed data. When a request arrives, the system first checks the cache (a "cache hit"). If the data is not found (a "cache miss"), it retrieves the data from the underlying source and often stores a copy in the cache for subsequent requests.\n\nCaches work because of the principle of locality: recently accessed data is likely to be accessed again (temporal locality), and data near recently accessed data is also likely to be needed (spatial locality).\n\nCommon implementations include in-memory stores like Redis or Memcached, CDN edge caches, and application-level caches. The choice depends on access patterns, data size, consistency requirements, and latency goals.',
  role: 'Reduces latency and load on backend data stores by serving repeated reads from fast storage.',
  tradeoffs: [
    { aspect: 'Latency', pros: 'Sub-millisecond reads from memory vs. disk-based database queries', cons: 'Cache misses add overhead of checking cache then falling back to source' },
    { aspect: 'Consistency', pros: 'Can serve stale-while-revalidate patterns for availability', cons: 'Stale data risk; requires invalidation strategy (TTL, write-through, event-based)' },
    { aspect: 'Cost', pros: 'Reduces database load and can defer costly scaling', cons: 'Memory is more expensive per GB than disk; cache infrastructure adds operational cost' },
    { aspect: 'Complexity', pros: 'Simple cache-aside pattern is straightforward to implement', cons: 'Cache invalidation is one of the hardest problems in CS; thundering herd, cold starts' },
  ],
  failureModes: [
    'Cache crash: all requests fall through to database, potentially overwhelming it (thundering herd / miss storm)',
    'Stale data served after source update if invalidation is delayed or missed',
    'Hot key problem: a single popular key overwhelms one cache node',
    'Cache stampede: many concurrent requests for the same expired key all hit the database simultaneously',
    'Memory pressure: cache evicts useful entries, degrading hit ratio',
  ],
  relatedConceptIds: ['load-balancer', 'database-index'],
};
