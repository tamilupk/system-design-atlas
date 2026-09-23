import type { ConceptContext } from '@/types/concept';

export const rateLimiterConceptContext: ConceptContext = {
  cache: {
    conceptId: 'cache',
    chapterRole: 'Serves as the high-throughput, low-latency in-memory store for rate limit token buckets and sliding window timestamps.',
    exampleData: `Key: "rl:{tenant_id}:{user_id}"\nType: Redis Hash or Sorted Set\nTTL: 60 seconds (auto-expires idle counters)`,
    specificConsiderations: [
      'Use atomic Redis Lua scripts to execute read-modify-write without multi-roundtrip race conditions.',
      'Expire idle counters; choose an eviction policy explicitly, because evicting active counters can reset quotas. Consider noeviction with a defined capacity-error policy.',
      'Deploy Redis in Multi-AZ Cluster mode to avoid single-point-of-failure bottlenecks.',
    ],
  },
  'load-balancer': {
    conceptId: 'load-balancer',
    chapterRole: 'Distributes traffic across API Gateway rate limiting instances using round-robin or least-connections.',
    exampleData: `Algorithm: Round-Robin\nHealth Check: GET /healthz every 5s\nSSL Termination: Offloaded at LB`,
    specificConsiderations: [
      'Gateways are stateless; no sticky sessions required.',
      'Load balancer can perform initial coarse CIDR-block rate limiting to absorb volumetric DDoS before reaching application tiers.',
    ],
  },
};
