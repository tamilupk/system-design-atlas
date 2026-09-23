# Archetype Authoring & Building Guide

This is the **single source of truth** for authoring and building new system design chapters (archetypes) in System Design Atlas.

It provides a seamless, zero-friction two-stage workflow:
1. **Part 1: Content Generation (ChatGPT / Claude)** — A hardened master prompt that forces the LLM to output mathematically rigorous curriculum content in the exact schema needed by our TypeScript contracts.
2. **Part 2: Coding Agent Implementation (Antigravity)** — The handoff instructions and copy-pasteable file templates that allow an AI coding agent to implement the archetype in one shot with zero compiler or runtime errors.

---

## Part 1: Content Generation (Prompt for ChatGPT / Claude)

Copy and paste the prompt below into **ChatGPT** or **Claude**. Replace `[SYSTEM NAME]` (e.g. `Distributed Rate Limiter`, `Notification Service`, `Distributed Key-Value Store`, `Real-Time Chat System`).

````markdown
You are a Principal Distributed Systems Engineer at a Tier-1 tech company (FAANG) and a top-tier System Design Interviewer.

I want to create a new interactive chapter for the "System Design Atlas" web app.
The system to design is: [SYSTEM NAME]

Generate the complete, mathematically grounded curriculum specification following the structured schema below.

### Requirements for Content Quality:
1. Target Audience: Engineers with 10+ years of experience preparing for Senior/Staff/Principal system design interviews.
2. Mathematical Rigor: Do not use vague estimates. Compute realistic writes/sec, peak reads/sec, payload sizes, working-set RAM (80/20 rule), network egress bandwidth, and 3-5 year storage retention.
3. Realistic Distributed Failure Modes: Include split-brain, network partitions, replica lag, thundering herds, hot partitions, and cache invalidation races.
4. Progressive Disclosure: Build from a simple baseline to an advanced multi-tier architecture over 8 to 9 steps.

### Produce your output structured into the following exact sections:

#### SECTION A: Metadata
- id: kebab-case unique string (e.g. "rate-limiter", "notifications", "chat")
- title: Display title (e.g. "Distributed Rate Limiter")
- description: 1-2 sentence executive summary of the system and architectural focus
- stage: Exactly one of: "foundation" | "advanced" | "genai"
- sequence: integer (e.g. 2, 3, 4...)
- availability: "available"
- estimatedMinutes: integer (e.g. 35, 45)
- tags: string array of 5-8 technical keywords (e.g. ["rate-limiter", "redis", "token-bucket", "distributed-systems", "concurrency"])

#### SECTION B: 9-Step Lesson Trajectory
Provide an array of 8 to 9 step definitions:
1. id: semantic kebab-case string (e.g. "requirements", "api-data", "baseline", "algorithm", "caching", "scaling", "resilience", "tradeoffs", "recap")
2. title: Display title (e.g. "Requirements & Scale")
3. shortTitle: 1-2 words for breadcrumbs & sidebar outline (e.g. "Requirements")
4. objective: 1 clear learning sentence
5. diagramStateId: diagram state ID ("empty" for text-only steps, or e.g. "baseline", "with-cache", "scaled")
6. highlightedNodes: array of node IDs to focus in this step (e.g. ["client", "gateway", "redis-cluster"])
7. flowSequenceId: optional flow sequence to auto-select/highlight (e.g. "allowed-request", "rate-limited-request")
8. concepts: array of concept IDs relevant to this step. Use existing IDs when applicable: "cache", "database-index", "load-balancer", "idempotency". If introducing a new concept, name it in kebab-case.

Standard 9-Step Sequence Blueprint:
- Step 1: Requirements & Scale (Functional/non-functional requirements, mathematical scale calculations)
- Step 2: API & Data Model (REST/gRPC endpoints, database schema, primary/partition keys)
- Step 3: Baseline Architecture (Minimal working design: Client -> Gateway -> Service -> Database)
- Step 4: Core Engine / Algorithm (Deep dive on domain-specific algorithm, e.g. Token Bucket vs Sliding Window Log)
- Step 5: Caching & Performance (Redis cache-aside, write-through, TTL, eviction policies)
- Step 6: Horizontal Scaling & Partitioning (Consistent hashing, routing tier, hot partition mitigation)
- Step 7: Reliability & Failure Modes (Circuit breakers, failover, fallback strategies, partition tolerance)
- Step 8: Architectural Trade-offs & Dilemmas (Comparison tables and trade-off analysis)
- Step 9: Recap & Interview Follow-ups (Architecture summary, senior interview follow-up curveball probes)

#### SECTION C: Diagram States & Specifications
Define 2-3 visual diagram states (e.g. "baseline", "scaled").
For each state, provide:
1. Nodes:
   - id: unique string (e.g. "client", "api-gateway", "app-server", "redis-cluster", "primary-db")
   - label: display name
   - role: Exactly one of: "client" | "service" | "database" | "cache" | "loadbalancer" | "queue" | "external"
   - x, y: Coordinates on standard 1000 x 500 grid:
     * Client: x: 70, y: 220
     * Ingress / Load Balancer / Gateway: x: 240, y: 220
     * Core Application / Service: x: 430, y: 220
     * Cache Tier: x: 430, y: 70
     * Queue / Worker Tier: x: 430, y: 370
     * Primary Database: x: 640, y: 220
     * Read Replicas / Secondary: x: 640, y: 370
   - spec (Component Specification):
     * responsibilities: 3 bullet points
     * inputsAndProtocols: Protocols and ports (e.g. "HTTPS / gRPC over HTTP/2")
     * outputsAndCodes: Responses and status codes (e.g. "HTTP 200 OK", "HTTP 429 Too Many Requests")
     * stateAndPersistence: State characteristics (e.g. "Stateless", "In-Memory with Redis AOF")
     * failureModes: 2 real failure modes and mitigations
     * tradeoffs: Key architectural trade-offs considered
2. Edges:
   - id: string formatted as "from-to" (e.g. "client-to-gateway", "gateway-to-app", "app-to-cache")
   - from: source node ID
   - to: target node ID
   - label: protocol or action (e.g. "HTTPS", "gRPC", "TCP/Redis", "SQL")
   - style: "solid" | "dashed"
3. Flow Sequences (Interactive packet flows):
   - id: kebab-case string (e.g. "allowed-flow", "throttled-flow")
   - title: Display title (e.g. "1. Request Allowed (Tokens Available)", "2. Request Throttled (429 Rate Limited)")
   - events: array of 3-6 sequential events:
     * label: short event label (e.g. "Client Request", "Token Check", "HTTP 429")
     * description: 1-sentence technical explanation of what is happening
     * edgeIds: array of edge IDs animated during this event
     * highlightNodeIds: array of node IDs glowing during this event

#### SECTION D: Interactive Decision Challenges
Define 1-2 senior FAANG decision challenges:
- id: kebab-case string (e.g. "token-bucket-storage")
- title: Dilemma title (e.g. "Architectural Dilemma: Centralized Redis vs Local Memory Rate Limiting")
- category: Category name (e.g. "Concurrency & Storage")
- scenario: Realistic high-throughput scenario description
- interviewContext: What FAANG interviewers evaluate with this question
- options: 3-4 options, where EXACTLY ONE has isOptimal: true:
  * id: string (e.g. "opt-redis", "opt-local", "opt-hybrid")
  * title: Option title
  * description: Technical implementation description
  * isOptimal: boolean (true for exactly one option)
  * simulationResult:
    - metric: e.g. "p99 Latency: 2.1ms | Cross-AZ Network Egress: $4,200/mo"
    - outcome: What happens to the system under 100k QPS stress
    - impact: Business and architectural impact
  * seniorRationale: The senior FAANG rationale explaining why this option is optimal or why it fails at scale
  * tradeOffSummary: "Pros: ... Cons: ..."

#### SECTION E: Concept Context
For each concept linked in lesson steps (e.g. "cache", "load-balancer", "idempotency", "database-index"):
- conceptId: string
- chapterRole: How this concept specifically operates in this system
- exampleData: Concrete configuration, Redis command, SQL schema snippet, or payload
- specificConsiderations: 3-5 bullet points of domain-specific edge cases

#### SECTION F: Step-by-Step Explanatory Markdown Content
For each of the 9 steps, provide:
- Main conceptual explanation with mathematical calculations
- Trade-off comparison tables (Aspect, Pros, Cons)
- Code snippets (e.g. Lua scripts for Redis atomic ops, SQL schemas, API definitions)
- Senior engineering callout insights
- Follow-up interview probe questions
````

---

## Part 2: Building with Antigravity (The Handoff Prompt)

Once ChatGPT or Claude produces the output, copy and paste it into **Antigravity** along with this prompt:

````markdown
Please implement the new archetype "[ARCHETYPE_NAME]" using the framework guidelines in docs/authoring-archetypes.md:

1. Create `src/archetypes/[ID]/` with the 7 required files:
   - `metadata.ts`
   - `lesson.ts`
   - `challenges.ts`
   - `concept-context.ts`
   - `diagrams.ts`
   - `steps/` (all 9 step components using `<StepContent>`, `<StepSection>`, `<Callout>`, `<TradeoffTable>`, `<DecisionChallenge>`, `<CodeBlock>`, `<CardGrid>`, `<Card>`)
   - `steps/index.ts`
   - `index.ts` (exporting default module: ArchetypeModule)
2. Register the archetype:
   - In `src/archetypes/catalog.ts`: import `[ID]Metadata` and replace or update the planned entry with `availability: 'available'`.
   - In `src/archetypes/registry.ts`: add the lazy loader function returning `mod.default`.
3. Verify the build:
   - Run `npm run typecheck && npm test && npm run build` to verify zero errors and static prerendering.

Here is the specification:
[PASTE CHATGPT / CLAUDE OUTPUT HERE]
````

---

## Part 3: Code Templates & Exact Type Contracts

To ensure coding agents generate syntactically correct code on the first attempt without compilation errors, follow these exact TypeScript file templates.

### 1. `src/archetypes/<id>/metadata.ts`
```typescript
import type { ArchetypeMetadata } from '@/types/archetype';

export const rateLimiterMetadata: ArchetypeMetadata = {
  id: 'rate-limiter',
  title: 'Distributed Rate Limiter',
  description: 'Design a high-throughput, low-latency rate limiter capable of protecting multi-tier APIs with token bucket, sliding window, and Redis Lua scripts.',
  stage: 'foundation', // 'foundation' | 'advanced' | 'genai'
  sequence: 2,
  availability: 'available', // 'available' | 'planned'
  estimatedMinutes: 40,
  tags: ['rate-limiter', 'redis', 'token-bucket', 'concurrency', 'distributed-systems'],
};
```

> [!IMPORTANT]
> - Use `stage: 'foundation' | 'advanced' | 'genai'` (NOT `difficulty`).
> - Use `availability: 'available'` (NOT `status`).
> - Always include `sequence: number`.

---

### 2. `src/archetypes/<id>/lesson.ts`
```typescript
import type { LessonDefinition } from '@/types/lesson';

export const rateLimiterLesson: LessonDefinition = {
  archetypeId: 'rate-limiter',
  title: 'Distributed Rate Limiter',
  contentVersion: 1,
  steps: [
    {
      id: 'requirements',
      title: 'Requirements & Scale',
      shortTitle: 'Requirements',
      objective: 'Define throughput requirements, accuracy trade-offs, and storage sizing for high-volume API rate limiting.',
      diagramStateId: 'empty',
      concepts: [],
    },
    {
      id: 'baseline',
      title: 'Baseline Architecture',
      shortTitle: 'Baseline',
      objective: 'Build a minimal rate limiting proxy in front of application services.',
      diagramStateId: 'baseline',
      highlightedNodes: ['client', 'gateway', 'service'],
      flowSequenceId: 'allowed-flow',
      concepts: ['load-balancer'],
    },
    {
      id: 'algorithm',
      title: 'Rate Limiting Algorithms',
      shortTitle: 'Algorithms',
      objective: 'Compare Token Bucket, Leaky Bucket, Fixed Window Counter, and Sliding Window Log.',
      diagramStateId: 'baseline',
      concepts: [],
    },
    {
      id: 'distributed-cache',
      title: 'Distributed State with Redis',
      shortTitle: 'Redis State',
      objective: 'Implement atomic rate limiting using Redis Cluster, Lua scripts, and pipeline batching.',
      diagramStateId: 'scaled',
      highlightedNodes: ['cache-node'],
      flowSequenceId: 'throttled-flow',
      concepts: ['cache'],
    },
    // ... complete all 9 steps
  ],
};
```

---

### 3. `src/archetypes/<id>/challenges.ts`
```typescript
import type { ChallengeDefinition } from '@/types/challenge';

export const rateLimiterChallenges: Record<string, ChallengeDefinition> = {
  'storage-strategy': {
    id: 'storage-strategy',
    title: 'Architectural Dilemma: Centralized Redis vs Local Memory Rate Limiting',
    category: 'State & Concurrency',
    scenario: 'Your system receives 500,000 QPS across 200 stateless gateway instances. You must enforce a strict per-user rate limit of 100 requests/minute without adding more than 2ms p99 latency to the API gateway path.',
    interviewContext: 'Interviewers evaluate your mastery of centralized consistency versus local memory approximation, network round-trip overhead, and memory synchronization.',
    options: [
      {
        id: 'opt-central-redis',
        title: 'Centralized Redis Cluster with Atomic Lua Scripts',
        description: 'Every gateway makes an atomic round-trip EVALSHA call to Redis Cluster before forwarding the request.',
        isOptimal: true,
        simulationResult: {
          metric: 'p99 Latency: 1.8ms | Accuracy: 100% strict enforcement',
          outcome: 'Every gateway enforces the exact global quota with zero cross-instance synchronization drift.',
          impact: 'Negligible latency penalty inside the same AWS Availability Zone; zero risk of quota overrun.',
        },
        seniorRationale: 'With pipelined Redis Cluster connections inside the same VPC/AZ, round-trips take ~0.8-1.5ms. The Redis single-threaded execution model executing atomic Lua scripts guarantees zero race conditions without distributed locks.',
        tradeOffSummary: 'Pros: 100% accurate, atomic, stateless gateways. Cons: Requires Redis Cluster capacity planning for network IOPS.',
      },
      {
        id: 'opt-local-memory',
        title: 'Local In-Memory Counter with Static Division (Quota / Instances)',
        description: 'Divide the 100 req/min quota by 200 instances (0.5 req/min per instance). Each gateway checks local memory.',
        isOptimal: false,
        simulationResult: {
          metric: 'p99 Latency: 0.05ms | Accuracy: Heavy premature throttling (>40% false positives)',
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
```

---

### 4. `src/archetypes/<id>/concept-context.ts`
```typescript
import type { ConceptContext } from '@/types/concept';

export const rateLimiterConceptContext: ConceptContext = {
  cache: {
    conceptId: 'cache',
    chapterRole: 'Serves as the high-throughput, low-latency in-memory store for rate limit token buckets and sliding window timestamps.',
    exampleData: `Key: "rl:{tenant_id}:{user_id}"\nType: Redis Hash or Sorted Set\nTTL: 60 seconds (auto-expires idle counters)`,
    specificConsiderations: [
      'Use atomic Redis Lua scripts to execute read-modify-write without multi-roundtrip race conditions.',
      'Always set volatile-ttl with explicit expiration to prevent unbounded memory growth from one-off callers.',
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
```

---

### 5. `src/archetypes/<id>/diagrams.ts`
Use the helper utilities from `@/utils/diagram-builder`:

```typescript
import type { DiagramDefinition } from '@/types/diagram';
import {
  createNode,
  createEdge,
  createFlowEvent,
  createFlowSequence,
  createDiagramState,
} from '@/utils/diagram-builder';

// 1. Nodes
const CLIENT_NODE = createNode({
  id: 'client',
  label: 'API Consumer',
  role: 'client',
  x: 70,
  y: 220,
  spec: {
    responsibilities: ['Initiates HTTP API calls', 'Handles HTTP 429 Retry-After response headers', 'Implements exponential backoff with jitter'],
    inputsAndProtocols: ['HTTPS 1.1 / HTTP/2'],
    outputsAndCodes: ['REST JSON payload', 'Authorization: Bearer <token>'],
    stateAndPersistence: 'Stateless',
    failureModes: ['Aggressive retry storms during partial outages (mitigated by jitter)'],
    tradeoffs: ['SDK client-side throttling vs pure server-side enforcement'],
  },
});

const GATEWAY_NODE = createNode({
  id: 'gateway',
  label: 'API Gateway / Limiter',
  role: 'service',
  x: 320,
  y: 220,
  conceptId: 'load-balancer',
  spec: {
    responsibilities: ['TLS termination', 'Extracts API key and token quota', 'Executes rate limiting policy'],
    inputsAndProtocols: ['HTTPS Port 443'],
    outputsAndCodes: ['HTTP 200 OK (passed)', 'HTTP 429 Too Many Requests (throttled)'],
    stateAndPersistence: 'Stateless; state offloaded to Redis Cluster',
    failureModes: ['Redis timeout (mitigated by fail-open policy with circuit breaker)'],
    tradeoffs: ['Fail-open (preserves availability) vs Fail-closed (protects downstream DB)'],
  },
});

const REDIS_NODE = createNode({
  id: 'redis',
  label: 'Redis Cluster',
  role: 'cache',
  x: 540,
  y: 120,
  conceptId: 'cache',
  spec: {
    responsibilities: ['Stores sliding window counter logs', 'Executes atomic Lua rate check script', 'Auto-expires keys with TTL'],
    inputsAndProtocols: ['RESP protocol over TCP port 6379'],
    outputsAndCodes: ['Integer response: 1 (allowed) or 0 (throttled)'],
    stateAndPersistence: 'In-memory with AOF persistence enabled',
    failureModes: ['Master failover latency (mitigated by Redis Sentinel / Cluster auto-failover in < 3s)'],
    tradeoffs: ['Sliding Window Log (exact, higher RAM) vs Token Bucket (approximate, minimal RAM)'],
  },
});

const BACKEND_NODE = createNode({
  id: 'backend',
  label: 'Core Services',
  role: 'service',
  x: 540,
  y: 320,
  spec: {
    responsibilities: ['Executes business logic and database writes'],
    inputsAndProtocols: ['Internal gRPC / HTTP'],
    outputsAndCodes: ['HTTP 200 JSON payload'],
    stateAndPersistence: 'Stateless',
    failureModes: ['Resource saturation if rate limiter fails closed/open incorrectly'],
    tradeoffs: ['Direct DB queries vs cached query results'],
  },
});

// 2. Edges (Explicit IDs recommended: 'source-to-target')
const edgeClientToGw = createEdge('client', 'gateway', 'HTTPS', { id: 'client-to-gw' });
const edgeGwToRedis = createEdge('gateway', 'redis', 'EVALSHA Lua', { id: 'gw-to-redis' });
const edgeGwToBackend = createEdge('gateway', 'backend', 'gRPC', { id: 'gw-to-backend' });

// 3. Flow Sequences
const allowedFlow = createFlowSequence('allowed-flow', '1. Allowed Request (Within Quota)', [
  createFlowEvent({
    label: '1. API Request',
    description: 'Client submits API request with API key header.',
    edgeIds: ['client-to-gw'],
    highlightNodeIds: ['client', 'gateway'],
  }),
  createFlowEvent({
    label: '2. Atomic Token Check',
    description: 'Gateway executes Redis Lua script to decrement token bucket.',
    edgeIds: ['gw-to-redis'],
    highlightNodeIds: ['gateway', 'redis'],
  }),
  createFlowEvent({
    label: '3. Forward to Service',
    description: 'Token available; Gateway forwards request to backend service.',
    edgeIds: ['gw-to-backend'],
    highlightNodeIds: ['gateway', 'backend'],
  }),
]);

const throttledFlow = createFlowSequence('throttled-flow', '2. Throttled Request (Quota Exceeded)', [
  createFlowEvent({
    label: '1. Excessive Request',
    description: 'Client exceeds 100 req/min rate limit threshold.',
    edgeIds: ['client-to-gw'],
    highlightNodeIds: ['client', 'gateway'],
  }),
  createFlowEvent({
    label: '2. Redis Quota Rejection',
    description: 'Redis Lua script returns 0 tokens remaining and TTL until replenishment.',
    edgeIds: ['gw-to-redis'],
    highlightNodeIds: ['gateway', 'redis'],
  }),
  createFlowEvent({
    label: '3. Return HTTP 429',
    description: 'Gateway immediately rejects request with 429 Too Many Requests and Retry-After header.',
    edgeIds: ['client-to-gw'],
    highlightNodeIds: ['gateway', 'client'],
  }),
]);

// 4. Export DiagramDefinition
export const rateLimiterDiagrams: DiagramDefinition = {
  states: {
    'baseline': createDiagramState('baseline', [CLIENT_NODE, GATEWAY_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToBackend]),
    'scaled': createDiagramState('scaled', [CLIENT_NODE, GATEWAY_NODE, REDIS_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToRedis, edgeGwToBackend], [allowedFlow, throttledFlow]),
  },
};
```

---

### 6. `src/archetypes/<id>/steps/<StepName>.tsx`
Each step is a clean React component composed using `@/components/lesson/StepComponents`:

```tsx
import React from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { 
  StepContent, 
  StepSection, 
  Callout, 
  TradeoffTable, 
  DecisionChallenge,
  CodeBlock,
  CardGrid,
  Card 
} from '@/components/lesson/StepComponents';
import { rateLimiterChallenges } from '../challenges';

export const AlgorithmStep: React.FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <StepContent>
      <StepSection title="Token Bucket vs Sliding Window Log">
        <p>
          At scale, choosing the right rate limiting algorithm dictates memory consumption, accuracy, and operational complexity.
        </p>
      </StepSection>

      <Callout label="Senior Engineering Insight" variant="insight">
        Sliding Window Log requires O(N) memory per user where N is request count, creating an unbounded RAM vulnerability during traffic bursts. In contrast, Token Bucket consumes a strictly deterministic 24 bytes per user.
      </Callout>

      <TradeoffTable
        title="Algorithm Comparison Matrix"
        items={[
          {
            aspect: 'Token Bucket',
            pros: 'O(1) memory (24 bytes); allows traffic bursts up to bucket capacity; CPU-efficient.',
            cons: 'Two parameters to tune (burst capacity and refill rate).',
          },
          {
            aspect: 'Sliding Window Log',
            pros: '100% mathematically precise; zero window-boundary reset spikes.',
            cons: 'O(N) memory; requires Redis ZREMRANGEBYSCORE on every request.',
          },
        ]}
      />

      <StepSection title="Atomic Redis Lua Implementation">
        <CodeBlock
          title="token_bucket.lua"
          language="lua"
          code={`local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1]) or capacity
local last_updated = tonumber(data[2]) or now

local delta = math.max(0, now - last_updated)
tokens = math.min(capacity, tokens + delta * refill_rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call("HMSET", key, "tokens", tokens, "last_updated", now)
  redis.call("EXPIRE", key, 60)
  return 1
else
  return 0
end`}
        />
      </StepSection>

      {/* Render Decision Challenge widget */}
      <DecisionChallenge challenge={rateLimiterChallenges['storage-strategy']!} />

      <StepSection title="Senior Interview Follow-up Probes">
        <CardGrid>
          <Card title="How to mitigate Redis failover latency?">
            Implement a client-side circuit breaker. If Redis p99 exceeds 5ms, trip the circuit to a local token bucket with relaxed limits.
          </Card>
          <Card title="What if an attacker spoofs X-Forwarded-For?">
            Only trust the leftmost IP if validated by upstream Cloudflare/edge proxy; prefer authenticated API keys or mutual TLS tokens.
          </Card>
        </CardGrid>
      </StepSection>
    </StepContent>
  );
};
```

---

### 7. `src/archetypes/<id>/steps/index.ts`
```typescript
import type { StepComponentMap } from '@/types/lesson';
import { RequirementsStep } from './RequirementsStep';
import { ApiDataStep } from './ApiDataStep';
import { BaselineStep } from './BaselineStep';
import { AlgorithmStep } from './AlgorithmStep';
import { CacheStep } from './CacheStep';
import { ScalingStep } from './ScalingStep';
import { ReliabilityStep } from './ReliabilityStep';
import { TradeoffsStep } from './TradeoffsStep';
import { RecapStep } from './RecapStep';

export const stepComponents: StepComponentMap = {
  'requirements': RequirementsStep,
  'api-data': ApiDataStep,
  'baseline': BaselineStep,
  'algorithm': AlgorithmStep,
  'caching': CacheStep,
  'scaling': ScalingStep,
  'reliability': ReliabilityStep,
  'tradeoffs': TradeoffsStep,
  'recap': RecapStep,
};
```

---

### 8. `src/archetypes/<id>/index.ts`
```typescript
import type { ArchetypeModule } from '@/types/archetype';
import { rateLimiterMetadata } from './metadata';
import { rateLimiterLesson } from './lesson';
import { rateLimiterDiagrams } from './diagrams';
import { rateLimiterConceptContext } from './concept-context';
import { stepComponents } from './steps';

const rateLimiterModule: ArchetypeModule = {
  metadata: rateLimiterMetadata,
  lesson: rateLimiterLesson,
  diagrams: rateLimiterDiagrams,
  conceptContext: rateLimiterConceptContext,
  stepComponents,
};

export default rateLimiterModule;
```

---

## Part 4: Wiring & Registration Checklist

Once the 8 files in `src/archetypes/<id>/` are created, wire the archetype into the application in 2 simple steps:

### Step 1: Update Catalog (`src/archetypes/catalog.ts`)
Locate the entry in `archetypeCatalog` (or add it if new) and import the metadata:

```typescript
import { rateLimiterMetadata } from './rate-limiter/metadata';

export const archetypeCatalog: readonly ArchetypeMetadata[] = [
  urlShortenerMetadata,
  rateLimiterMetadata, // <-- Replaces the planned entry with the live available metadata
  // remaining planned entries...
];
```

### Step 2: Register Lazy Loader (`src/archetypes/registry.ts`)
Add the dynamic import entry to `archetypeRegistry`:

```typescript
export const archetypeRegistry: Record<string, ArchetypeLazyLoader> = {
  'url-shortener': async (): Promise<ArchetypeModule> => {
    const mod = await import('./url-shortener/index');
    return mod.default;
  },
  'rate-limiter': async (): Promise<ArchetypeModule> => {
    const mod = await import('./rate-limiter/index');
    return mod.default;
  },
};
```

> [!CAUTION]
> Always return `mod.default` because the archetype module is exported with `export default <id>Module;`.

---

## Part 5: Quality Checklist & Anti-Hallucination Rules

Before finishing the implementation, coding agents must verify against these rules:

| # | Check | Rule |
|---|---|---|
| 1 | **Export Default** | `src/archetypes/<id>/index.ts` MUST export default `ArchetypeModule`. Do NOT export `chapterImplementation`. |
| 2 | **Registry Loader** | `src/archetypes/registry.ts` MUST use `const mod = await import('./<id>/index'); return mod.default;`. |
| 3 | **Metadata Types** | `metadata.ts` MUST use `stage: 'foundation' \| 'advanced' \| 'genai'` and `availability: 'available'`. Never use `status` or `difficulty`. |
| 4 | **Edge IDs in Flows** | The `edgeIds` in `FlowEvent` MUST match the `id` of the edges passed to `createDiagramState`. Recommend using explicit IDs like `{ id: 'client-to-gateway' }`. |
| 5 | **Diagram State IDs** | Every `diagramStateId` in `lesson.ts` (e.g. `'baseline'`, `'scaled'`) MUST exist as a key in `diagrams.states` (except `'empty'` for text-only steps). |
| 6 | **Step IDs** | The keys in `steps/index.ts` (`stepComponents`) MUST match the step `id` strings defined in `lesson.ts`. |
| 7 | **Challenges** | `challenges.ts` is NOT part of `ArchetypeModule` in `index.ts`. Challenges are imported and passed directly to `<DecisionChallenge challenge={...} />` inside step components. |
| 8 | **Build Verification** | Always run `npm run typecheck && npm test && npm run build` to verify TypeScript, unit tests, and production static prerendering. |
