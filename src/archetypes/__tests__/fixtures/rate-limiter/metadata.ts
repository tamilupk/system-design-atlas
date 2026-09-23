import type { ArchetypeMetadata } from '@/types/archetype';

export const rateLimiterMetadata: ArchetypeMetadata = {
  id: 'rate-limiter',
  title: 'Distributed Rate Limiter',
  description: 'Design a high-throughput, low-latency rate limiter capable of protecting multi-tier APIs with token bucket, sliding window, and Redis Lua scripts.',
  stage: 'foundation', // 'foundation' | 'advanced' | 'genai'
  sequence: 99, // Example only: choose an unused position in the real catalog.
  availability: 'available', // 'available' | 'planned'
  estimatedMinutes: 40,
  tags: ['rate-limiter', 'redis', 'token-bucket', 'concurrency', 'distributed-systems'],
};
