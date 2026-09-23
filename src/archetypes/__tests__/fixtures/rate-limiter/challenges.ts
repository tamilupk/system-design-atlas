import type { ChallengeMap } from '@/types/challenge';

export const rateLimiterChallenges: ChallengeMap = {
  'storage-strategy': {
    id: 'storage-strategy',
    title: 'Architectural Dilemma: Centralized Redis vs Local Memory Rate Limiting',
    category: 'State & Concurrency',
    scenario: 'Your system receives 500,000 QPS across 200 stateless gateway instances. You must enforce a strict per-user rate limit of 100 requests/minute with a target of less than 2ms added p99 latency. Assume one authoritative Redis primary per key and normal operation; separately discuss failover and partitions.',
    interviewContext: 'Interviewers evaluate your mastery of centralized consistency versus local memory approximation, network round-trip overhead, and memory synchronization.',
    options: [
      {
        id: 'opt-central-redis',
        title: 'Centralized Redis Cluster with Atomic Lua Scripts',
        description: 'Every gateway makes an atomic round-trip EVALSHA call to Redis Cluster before forwarding the request.',
        isOptimal: true,
        simulationResult: {
          metric: 'Illustrative target: <2ms added p99; benchmark under the stated workload',
          outcome: 'An atomic script serializes updates for each key on its authoritative primary during normal operation.',
          impact: 'Adds a network dependency. Failover can lose recent writes; strict enforcement during failures needs an explicit policy.',
        },
        seniorRationale: 'Atomic Lua scripts avoid read-modify-write races on a primary. Measure end-to-end latency and size for key skew; asynchronous replication and failover do not provide a universal strict-quota guarantee.',
        tradeOffSummary: 'Pros: Per-key atomic decisions and stateless gateways. Cons: Network latency, hot keys, capacity planning, and failure-policy trade-offs.',
      },
      {
        id: 'opt-local-memory',
        title: 'Local In-Memory Counter with Static Division (Quota / Instances)',
        description: 'Divide the 100 req/min quota by 200 instances (0.5 req/min per instance). Each gateway checks local memory.',
        isOptimal: false,
        simulationResult: {
          metric: 'Illustrative expectation: lower local latency; premature throttling under uneven routing',
          outcome: 'Because user requests are routed via load balancer without sticky sessions, users get throttled prematurely on one node while having ample quota remaining globally.',
          impact: 'Catastrophic user experience degradation for legitimate API customers.',
        },
        seniorRationale: 'Static quota division fails completely in production because client traffic is not uniformly distributed across all gateway instances. Sticky sessions introduce hot instances and destroy stateless auto-scaling.',
        tradeOffSummary: 'Pros: Sub-millisecond latency. Cons: Severe false-positive throttling; breaks without sticky sessions.',
      },
      // 1-2 additional options
    ],
  },
};
