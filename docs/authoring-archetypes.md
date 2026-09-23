# Archetype Authoring & Building Guide

This is the **single source of truth** for authoring and building new system design chapters (archetypes) in System Design Atlas.

It provides a two-stage workflow:
1. **Part 1: Content Generation (ChatGPT / Claude)** — A master prompt that asks the LLM for mathematically grounded curriculum content in the exact schema our TypeScript contracts expect.
2. **Part 2: Coding Agent Implementation** — The handoff instructions and file templates that let a coding agent implement the archetype against those contracts.

The templates are checked against the real type definitions, but they are **starting points, not guarantees**. An LLM will still produce content that does not typecheck or that references IDs which do not exist. Part 5 lists the acceptance commands, including `validateArchetypeModule`, which is what actually catches those mistakes — run it, do not assume a clean first pass.

---

## Required workflow for a coding agent

Treat this document as the complete chapter implementation checklist. Read it before writing content or code; inspect the current types and registered IDs rather than relying on names from a previous conversation.

1. **Define the content:** choose stable chapter/step/challenge IDs and an unused catalog sequence. Generate the specification using Part 1, then review assumptions, calculations, failure modes, and technical claims. The executable example below has one step for brevity; a published chapter needs the complete reviewed learning trajectory.
2. **Preserve the reference UI:** use URL Shortener as the visual reference and compose steps from `@/components/lesson/StepComponents`. Reuse the existing `src/pages/LessonPage.tsx` shell, diagram canvas, outline, navigation, notes, completion, challenges, and concept inspector automatically through the registry. Do not create another route shell or copy chapter-private CSS. Use `src/styles/tokens.css` for any necessary custom widgets, kept inside the new chapter. Existing reference steps with private styles are not templates for new chapters.
3. **Implement the chapter:** follow the file contracts in Part 3. Keep manifests and metadata lightweight; keep lesson UI behind the dynamic import. Never change shared pages to branch on the new chapter ID. Only extend a shared component when it provides a reusable capability.
4. **Register all three entries:** metadata in `src/archetypes/catalog.ts`, the default-exporting lazy loader in `src/archetypes/registry.ts`, and the data-only manifest in `src/archetypes/step-manifests.ts`. Register new shared concepts separately. Keep incomplete chapters planned; publish as available only with complete content and passing checks.
5. **Verify before declaring completion:** run every Part 5 command in order. Inspect the new chapter at desktop sizes (1440×900 and 1366×768), checking long text, tables, code, diagram labels/edges, node inspection, flow playback, keyboard navigation, challenge evaluation, reload/resume, and notes. Mobile is secondary, but content must remain accessible. Check step URLs directly and confirm readable lesson content in generated HTML and entries in `dist/sitemap.xml`.
6. **Report evidence:** list changed files, commands and results, desktop checks, and any unresolved content or layout limitation. Do not call a chapter complete based only on TypeScript passing. No deployment is required for chapter authoring.

### Choosing and evolving chapter length

There is no fixed minimum, maximum, or preferred step count in the runtime. Published chapters must tell a complete story; the one-step test fixture demonstrates wiring only. Do not pad a six-step lesson to nine, compress a complex system to nine, or replace nine with another universal target.

- Give each step one primary learning objective and a question the reader can answer afterward. A focused six-step chapter may combine requirements with API/data, while a broad chapter can separate recovery, presence, fan-out, operations, and regional failover.
- Split when independent decisions, exercises, or failure models compete for attention. Add explanation, counterexamples, and checks of understanding where needed; merely moving paragraphs into thin pages is not an improvement.
- Merge when adjacent steps repeat the same objective or lack enough substance to stand alone. Do not use word counts, equal page lengths, or one diagram per step as quality proxies.
- Reuse diagram states when they still explain the decision. Add states and challenges when the learning trajectory needs them; their counts should also follow the content, not a quota.
- Review the full sequence for prerequisites, repetition, reading load, and a clear return to the final design. Update `estimatedMinutes` to reflect reading and exercise time; it is an estimate, not a pacing promise.
- When expanding a published chapter, preserve existing semantic step IDs, challenge IDs, and their meanings. Retitle or reorder only while keeping the original topic recognizable. Give extracted topics new IDs; never repurpose an old ID for an unrelated lesson. Increment `contentVersion` for a substantive revision.
- Register the revised manifest and component map together. Completion and numbering derive from the current step list: existing completions, notes, and resume URLs remain attached to their IDs; added steps start incomplete. A previously complete chapter may therefore become partially complete. Do not copy old completion marks onto new steps or reset reader history. `contentVersion` is content metadata, not a progress-schema migration.
- Verify all step routes, previous/next navigation, outline, resume, notes, challenges, progress denominator, and prerender/sitemap output. Derive count assertions from the chapter manifest; keep historical ID lists only in explicit compatibility tests. Test a saved pre-expansion state when changing a shipped trajectory. Never add runtime count limits merely to enforce a writing preference.

Fresh checkout: use Node.js 22 and `npm ci`. Install the browser once with `npx playwright install chromium` (CI uses `--with-deps`). See Part 5 for the full verification sequence.

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
3. Show Your Work: Every number must state its assumptions and its derivation. Write "100M DAU × 2 actions/day ÷ 86400s ≈ 2,300 avg writes/sec; ×3 peak factor ≈ 7,000 peak writes/sec", never just "7,000 writes/sec". The same applies to memory, latency, storage, and cost figures.
4. Realistic Distributed Failure Modes: Include split-brain, network partitions, replica lag, thundering herds, hot partitions, and cache invalidation races — where they actually apply to this system.
5. Progressive Disclosure: Choose the step count from the learning objectives, not a fixed quota. A focused system may need about 6 steps; a broader system may need 10–15 or more. These are examples, not bounds. Start with the simplest correct baseline and add a step when it introduces a distinct decision, invariant, failure mode, or exercise. Merge shallow steps; split overloaded ones. Explain why the chosen boundaries fit this system.
6. Architecture Follows the System: The step trajectory below is a **suggested outline**, not a rule. Do not add Redis, an API gateway, sharding, or read replicas just because the outline mentions them. Messaging, collaboration, stream processing, storage, and GenAI systems each deserve their own middle steps (ordering guarantees, presence and CRDTs, watermarks and backpressure, compaction and repair, token budgets and model routing). Keep the consistent shape — requirements → API/data → baseline → domain core → scale → reliability → trade-offs → recap — and vary the substance.
7. Honesty About Numbers: Label simulated or back-of-envelope results as illustrative (for example "Illustrative estimate, not a measured benchmark"). Never present a hard-coded latency or cost figure as a measurement. Qualify strong claims ("in our experience", "at this scale", "typically") or cite the mechanism that produces the number.
8. No Universal Answers: Distinguish what is preferred **for this scenario** from what is universally correct. A choice that wins at 100k QPS may be wrong at 1k QPS; say so.
9. Concepts: Reuse the shared concepts already registered in `src/concepts/registry.ts` ("cache", "database-index", "load-balancer", "idempotency") where they genuinely apply. If the chapter needs a new one, define it in Section E as a **shared** concept (reusable explanation, trade-offs, failure modes) plus a **chapter-specific** context entry (how it behaves here, example data, edge cases). Never fold chapter-specific detail into the shared explanation.

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

#### SECTION B: Lesson Trajectory (variable length, justified pacing)
First give a brief rationale for the chosen step count and boundaries. Then provide the complete array of step definitions:
1. id: semantic kebab-case string, **stable forever** (e.g. "requirements", "api-data", "baseline", "algorithm", "caching", "scaling", "resilience", "tradeoffs", "recap"). Reader progress is keyed by this id — never rename it later.
2. title: Display title (e.g. "Requirements & Scale")
3. shortTitle: 1-2 words for breadcrumbs & sidebar outline (e.g. "Requirements")
4. objective: 1 clear learning sentence
5. diagramStateId: diagram state ID (omit for text-only steps; otherwise e.g. "baseline", "with-cache", "scaled")
6. highlightedNodes: array of node IDs **that exist in that diagram state** to focus in this step (e.g. ["client", "gateway", "redis"])
7. flowSequenceId: optional flow sequence **declared by that same diagram state** to auto-select/highlight (e.g. "allowed-flow", "throttled-flow")
8. concepts: array of concept IDs relevant to this step. Reuse registered IDs where they genuinely apply: "cache", "database-index", "load-balancer", "idempotency". If introducing a new concept, name it in kebab-case and define it in Section E.

Suggested coverage areas — these are not required one-to-one steps. Combine related areas for a focused chapter or split substantial areas into multiple lessons. Preserve requirements, a correct baseline, domain reasoning, relevant scaling/failure analysis, trade-offs, and synthesis somewhere in the trajectory; do not force Redis, a gateway, sharding, or read replicas where they do not belong:
- Coverage: Requirements & Scale (Functional/non-functional requirements, mathematical scale calculations with stated assumptions)
- Coverage: API & Data Model (REST/gRPC endpoints, database schema, primary/partition keys)
- Coverage: Baseline Architecture (Minimal working design for *this* system)
- Coverage: Core Engine / Algorithm (The domain-specific heart — e.g. Token Bucket vs Sliding Window Log, ordering guarantees, watermarking, compaction)
- Coverage: Performance / State (Caching, or the state-management concern that actually dominates this system)
- Coverage: Horizontal Scaling & Partitioning (Only if the system needs it; otherwise the relevant scale axis)
- Coverage: Reliability & Failure Modes (Circuit breakers, failover, fallback strategies, partition tolerance)
- Coverage: Architectural Trade-offs & Dilemmas (Comparison tables and trade-off analysis)
- Coverage: Recap & Interview Follow-ups (Architecture summary, senior interview follow-up curveball probes)

#### SECTION C: Diagram States & Specifications
Define the visual diagram states needed to explain the trajectory (often 2–3 initially, more when distinct architectural changes warrant them). Reuse a state across steps where appropriate; do not add components merely to make a new diagram.
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
   - Edges are **directed**: a flow event animates the packet along the edge's `from`→`to` direction. Model a response as its own edge pointing back (e.g. a dashed `gw-to-client`), never by reusing the request edge — reusing it animates the response backwards.
3. Flow Sequences (Interactive packet flows):
   - id: kebab-case string (e.g. "allowed-flow", "throttled-flow")
   - title: Display title (e.g. "1. Request Allowed (Tokens Available)", "2. Request Throttled (429 Rate Limited)")
   - events: array of 3-6 sequential events:
     * label: short event label (e.g. "Client Request", "Token Check", "HTTP 429")
     * description: 1-sentence technical explanation of what is happening
     * edgeIds: array of edge IDs animated during this event
     * highlightNodeIds: array of node IDs glowing during this event

#### SECTION D: Interactive Decision Challenges
Define decision challenges at consequential architectural forks (often 1–2 initially; add more when they test distinct reasoning rather than repeat a lesson):
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

#### SECTION E: Concepts
Two different things, kept separate on purpose:

**E1. Shared concept definitions** — only for concepts that are genuinely reusable across chapters. Already registered: "cache", "database-index", "load-balancer", "idempotency". If this chapter needs a new one, provide the full `SharedConcept`:
- id: kebab-case, stable (it is used in concept URLs and referenced by diagram nodes)
- title, summary: 1-line hook
- explanation: 2-4 paragraphs of chapter-independent explanation
- role: what the component does architecturally, in general
- tradeoffs: array of { aspect, pros, cons }
- failureModes: array of realistic failure modes
- relatedConceptIds: other registered concept IDs

**E2. Chapter-specific concept context** — for every concept linked from Section B, including the reused ones:
- conceptId: must match a registered concept ID
- chapterRole: how this concept specifically operates in *this* system
- exampleData: concrete configuration, Redis command, SQL schema snippet, or payload
- specificConsiderations: 3-5 bullet points of domain-specific edge cases

Never put chapter-specific detail into E1, and never duplicate the generic explanation into E2.

#### SECTION F: Step-by-Step Explanatory Markdown Content
For each step, provide:
- Main conceptual explanation with mathematical calculations
- Trade-off comparison tables (Aspect, Pros, Cons)
- Code snippets (e.g. Lua scripts for Redis atomic ops, SQL schemas, API definitions)
- Senior engineering callout insights
- Follow-up interview probe questions
````

---

## Part 2: Building with a Coding Agent (The Handoff Prompt)

Once ChatGPT or Claude produces the output, copy and paste it into your coding agent along with this prompt:

````markdown
Please implement the new archetype "[ARCHETYPE_NAME]" using the framework guidelines in docs/authoring-archetypes.md:

1. Create `src/archetypes/[ID]/` with these files:
   - `metadata.ts`
   - `lesson.ts`
   - `challenges.ts`
   - `concept-context.ts`
   - `diagrams.ts`
   - `steps-manifest.ts` (data-only id/title/shortTitle list, mirroring `lesson.ts` in order)
   - `steps/` (one component per step, composed from `@/components/lesson/StepComponents`)
   - `steps/index.ts`
   - `index.ts` (default-exporting `ArchetypeModule`, including `challenges`)
   Keep genuinely chapter-specific widgets in `src/archetypes/[ID]/components/`. Do not copy another chapter's private files or CSS.
2. Register the archetype:
   - `src/archetypes/catalog.ts`: import `[ID]Metadata` and replace the planned entry with it (`availability: 'available'`).
   - `src/archetypes/registry.ts`: add the lazy loader returning `mod.default`.
   - `src/archetypes/step-manifests.ts`: add the `[ID]` → manifest entry.
   - If the chapter introduces new shared concepts, register them in `src/concepts/registry.ts`.
3. Validate and verify:
   - Register the catalog, loader, and manifest; the shipped-archetypes tests automatically validate every registered chapter.
   - Preserve the URL Shortener look and feel using shared StepComponents and the existing LessonPage shell; do not introduce a chapter-specific page layout.
   - Run `npm run typecheck && npm run lint && npm test && npm run build && npm run test:build && npm run test:e2e`. Install Chromium first if needed. Fix failures; do not assume a clean first pass.
   - Perform the desktop and content checks in the Required workflow above and report the results.

Here is the specification:
[PASTE CHATGPT / CLAUDE OUTPUT HERE]
````

---

## Part 3: Code Templates & Exact Type Contracts

To give coding agents a correct starting point, follow these TypeScript file templates. Together they form a complete one-step example, not a finished curriculum. They mirror the real contracts in `src/types/`, but every ID inside them is illustrative — replace them with the chapter's own IDs and keep them consistent across all files. `validateArchetypeModule` (Part 5) is what verifies the consistency.

### 1. `src/archetypes/<id>/metadata.ts`
```typescript
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
  steps: [{
    id: 'algorithm',
    title: 'Rate Limiting Algorithms',
    shortTitle: 'Algorithms',
    objective: 'Compare rate limiting algorithms and their distributed state trade-offs.',
    diagramStateId: 'scaled',
    highlightedNodes: ['redis'],
    flowSequenceId: 'throttled-flow',
    concepts: ['cache', 'load-balancer'],
  }],
};
```

> [!IMPORTANT]
> Every `id` above must line up with another file, or the chapter silently breaks:
> - `archetypeId` must equal `metadata.id`.
> - `diagramStateId` must be a key of `diagrams.states` (`'empty'` is reserved for text-only steps).
> - `highlightedNodes` must be node IDs **inside that diagram state**, and `flowSequenceId` must be a flow sequence **declared by that same state**.
> - `concepts` must be registered in `src/concepts/registry.ts` (see Part 4, Step 3).
> - Each `id` must have a matching key in `steps/index.ts`, an entry in `steps-manifest.ts`, and a component.
>
> `validateArchetypeModule` checks all of these; run it rather than eyeballing the IDs.

> [!CAUTION]
> **Step IDs are persisted.** Reader progress is stored per `archetypeId` + `stepId`, so renaming a step ID orphans that step's saved visited/completed state for every existing reader. Treat step IDs as append-only: add new steps freely, but never rename them without a migration. Reordering preserves keyed progress but changes the learning sequence.

---

### 3. `src/archetypes/<id>/challenges.ts`
```typescript
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
// Edges are directed: an event animates the packet in the edge's from→to direction.
// Model responses as their own dashed edge pointing back (gw→client), never by
// reusing the request edge — that would animate the response backwards.
const edgeClientToGw = createEdge('client', 'gateway', 'HTTPS', { id: 'client-to-gw' });
const edgeGwToRedis = createEdge('gateway', 'redis', 'EVALSHA Lua', { id: 'gw-to-redis' });
const edgeGwToBackend = createEdge('gateway', 'backend', 'gRPC', { id: 'gw-to-backend' });
const edgeGwToClient = createEdge('gateway', 'client', 'HTTP 429', { id: 'gw-to-client', style: 'dashed' });

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
    description: 'Redis Lua script rejects the request; the gateway derives Retry-After from the refill policy.',
    edgeIds: ['gw-to-redis'],
    highlightNodeIds: ['gateway', 'redis'],
  }),
  createFlowEvent({
    label: '3. Return HTTP 429',
    description: 'Gateway immediately rejects request with 429 Too Many Requests and Retry-After header.',
    edgeIds: ['gw-to-client'],
    highlightNodeIds: ['gateway', 'client'],
  }),
]);

// 4. Export DiagramDefinition
export const rateLimiterDiagrams: DiagramDefinition = {
  states: {
    'baseline': createDiagramState('baseline', [CLIENT_NODE, GATEWAY_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToBackend]),
    'scaled': createDiagramState('scaled', [CLIENT_NODE, GATEWAY_NODE, REDIS_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToRedis, edgeGwToBackend, edgeGwToClient], [allowedFlow, throttledFlow]),
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
  Paragraph,
  ConceptLink,
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
        <Paragraph>
          At scale, choosing the right rate limiting algorithm dictates memory consumption, accuracy, and operational complexity.
        </Paragraph>
        <Paragraph>
          Both families keep their counters in a{' '}
          <ConceptLink conceptId="cache" onConceptClick={onConceptClick}>cache</ConceptLink>{' '}
          tier so that gateways stay stateless.
        </Paragraph>
      </StepSection>

      <Callout label="Senior Engineering Insight" variant="insight">
        Sliding Window Log requires O(N) memory per user where N is request count, creating an unbounded RAM vulnerability during traffic bursts. In contrast, Token Bucket stores O(1) state per user; actual bytes depend on encoding, key size, allocator, and datastore overhead.
      </Callout>

      <TradeoffTable
        title="Algorithm Comparison Matrix"
        items={[
          {
            aspect: 'Token Bucket',
            pros: 'O(1) state per user; allows traffic bursts up to bucket capacity; CPU-efficient.',
            cons: 'Two parameters to tune (burst capacity and refill rate).',
          },
          {
            aspect: 'Sliding Window Log',
            pros: 'Tracks requests in a rolling window; precision depends on timestamp resolution and atomic updates.',
            cons: 'O(N) memory; requires Redis ZREMRANGEBYSCORE on every request.',
          },
        ]}
      />

      <StepSection title="Atomic Redis Lua Implementation">
        <Paragraph>Illustrative single-key algorithm. Validate positive capacity and refill rate, use a consistent clock, and define failover behavior before production use.</Paragraph>
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
  redis.call("EXPIRE", key, math.max(1, math.ceil(capacity / refill_rate)))
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
            Accept forwarding headers only from trusted proxies that sanitize them; resolve the client using the configured trusted proxy chain. Prefer authenticated tenant or API identities for quotas.
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
import { AlgorithmStep } from './AlgorithmStep';

export const stepComponents: StepComponentMap = {
  algorithm: AlgorithmStep,
};
```

---

### 8. `src/archetypes/<id>/steps-manifest.ts`
A data-only mirror of `lesson.ts` step ids/titles, so chapter-agnostic surfaces (home page and curriculum list) can enumerate steps **without** importing the lesson, diagrams, or any step component. `validateStepManifest` fails the tests if this drifts from `lesson.ts`.

```typescript
import type { ChapterStepManifest } from '@/types/lesson';

export const rateLimiterStepManifest: ChapterStepManifest = [
  { id: 'algorithm', title: 'Rate Limiting Algorithms', shortTitle: 'Algorithms' },
];
```

> [!IMPORTANT]
> The `id`, `title`, and `shortTitle` here MUST exactly match `lesson.ts`, in the same order.

---

### 9. `src/archetypes/<id>/index.ts`
```typescript
import type { ArchetypeModule } from '@/types/archetype';
import { rateLimiterMetadata } from './metadata';
import { rateLimiterLesson } from './lesson';
import { rateLimiterDiagrams } from './diagrams';
import { rateLimiterConceptContext } from './concept-context';
import { rateLimiterChallenges } from './challenges';
import { stepComponents } from './steps';

const rateLimiterModule: ArchetypeModule = {
  metadata: rateLimiterMetadata,
  lesson: rateLimiterLesson,
  diagrams: rateLimiterDiagrams,
  conceptContext: rateLimiterConceptContext,
  stepComponents,
  challenges: rateLimiterChallenges,
};

export default rateLimiterModule;
```

> [!NOTE]
> `challenges` is part of the module contract. Step components still import the challenge map directly to pass a specific challenge to `<DecisionChallenge />`; exposing it on the module lets validators and tooling reach the chapter's challenges without importing step components.

---

## Part 4: Wiring & Registration Checklist

Once the files in `src/archetypes/<id>/` are created, wire the archetype into the application:

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

`sequence` must stay unique across the catalog, and `availability` must be `'available'` — `validateArchetypeCatalog` rejects an available catalog entry that has no registry loader, and a registry loader whose catalog entry is still `'planned'`.

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

### Step 3: Register the Step Manifest (`src/archetypes/step-manifests.ts`)
This is what keeps the home page and curriculum list chapter-agnostic — they read manifests instead of hard-coding step IDs:

```typescript
import { rateLimiterStepManifest } from './rate-limiter/steps-manifest';

export const chapterStepManifests: Readonly<Record<string, ChapterStepManifest>> = {
  'url-shortener': urlShortenerStepManifest,
  'rate-limiter': rateLimiterStepManifest,
};
```

> [!CAUTION]
> Only register manifests for **available** chapters. A manifest for a planned chapter makes it look navigable from the home page while its content is still lazy-loaded behind a registry entry that does not exist.

### Step 4: Register New Shared Concepts (`src/concepts/`)
Only needed if the chapter introduces a concept that other chapters can reuse:

1. Create `src/concepts/<concept-id>.ts` exporting a `SharedConcept` — the chapter-independent explanation, `role`, `tradeoffs`, `failureModes`, and `relatedConceptIds`.
2. Add it to the registry:

```typescript
import { rateLimitBucketConcept } from './rate-limit-bucket';

const conceptRegistry: Record<string, SharedConcept> = {
  cache: cacheConcept,
  'database-index': databaseIndexConcept,
  'load-balancer': loadBalancerConcept,
  idempotency: idempotencyConcept,
  'rate-limit-bucket': rateLimitBucketConcept,
};
```

3. Keep the **chapter-specific** part in `src/archetypes/<id>/concept-context.ts`, keyed by the same concept ID.

Concept IDs are stable identifiers: they are referenced from `lesson.ts` steps, `diagrams.ts` nodes, and `concept-context.ts`, and they appear in concept URLs. `validateArchetypeModule` reports `step/concept-unregistered`, `diagram/node-concept-unregistered`, and `concept-context/unregistered` when an ID is missing from the registry.

### Step 5: Automatic Validation
The shipped-archetypes suite automatically loads every registered chapter and validates its manifest and cross-references. No chapter-specific test registration is required. Production prerendering runs the same validators and fails on invalid content before emitting routes.

### Step 6: Static Rendering
`scripts/prerender.ts` generates SEO HTML for every **available** catalog entry, its steps (from the validated lesson definition), and the shared concept pages. A newly registered chapter is picked up automatically — verify its routes appear in `dist/sitemap.xml` after `npm run build`.

---

## Part 5: Quality Checklist & Validation

### Automated validation
`src/archetypes/validate.ts` is the authority on these rules — do not eyeball IDs. It collects *all* problems instead of failing on the first, so one run reports everything:

```typescript
import { validateArchetypeModule, formatArchetypeIssues } from '@/archetypes/validate';

const result = validateArchetypeModule(module, {
  knownConceptIds: getAllConcepts().map((concept) => concept.id),
  stepManifest: rateLimiterStepManifest,
});
if (!result.valid) throw new Error(formatArchetypeIssues('rate-limiter', result.issues));
```

It checks, among others: metadata field types and enum values; `lesson.archetypeId === metadata.id`; duplicate step IDs; every `diagramStateId`, `flowSequenceId`, `highlightedNodes` entry, and `conceptId` resolving to something that exists; diagram node/edge ID uniqueness and edge endpoints; flow events referencing real edges and nodes; `concept-context` keys matching registered concepts and the concepts used by steps; challenge keys matching IDs, unique option IDs, and exactly one `isOptimal` option; `stepComponents` covering every step with no unreachable keys; and step-manifest ↔ lesson agreement (IDs, order, titles).

`validateArchetypeCatalog` additionally checks catalog ID/sequence uniqueness and that available ↔ registered ↔ manifest entries line up.

### Acceptance commands
```bash
npm run typecheck   # 0 errors (strict, noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess)
npm run lint        # 0 warnings (--max-warnings 0)
npm test            # all unit tests, including the validate suite
npm run build       # validates chapters and writes dist/ and sitemap.xml
npm run test:build  # checks generated HTML; run after build
npm run test:e2e    # browser regression coverage
```

### Rules the compiler cannot catch

| # | Check | Rule |
|---|---|---|
| 1 | **Export Default** | `src/archetypes/<id>/index.ts` MUST export default `ArchetypeModule`. Do NOT export `chapterImplementation`. |
| 2 | **Registry Loader** | `src/archetypes/registry.ts` MUST use `const mod = await import('./<id>/index'); return mod.default;`. |
| 3 | **Metadata Types** | `metadata.ts` MUST use `stage: 'foundation' \| 'advanced' \| 'genai'` and `availability: 'available'`. Never use `status` or `difficulty`. |
| 4 | **Edge IDs in Flows** | The `edgeIds` in `FlowEvent` MUST match the `id` of the edges passed to `createDiagramState`. Recommend explicit IDs like `{ id: 'client-to-gateway' }`. |
| 5 | **Diagram State IDs** | Every `diagramStateId` in `lesson.ts` MUST exist as a key in `diagrams.states` (omit the field for text-only steps; `empty` is not a reserved state). |
| 6 | **Step IDs** | The keys in `steps/index.ts`, the entries in `steps-manifest.ts`, and the step `id`s in `lesson.ts` MUST cover the same IDs; manifest order MUST match lesson order. |
| 7 | **Challenges** | `challenges.ts` IS part of `ArchetypeModule` (`challenges:` in `index.ts`). Step components also import the map directly to pass one challenge to `<DecisionChallenge />`. |
| 8 | **Shared Primitives** | Compose steps from `@/components/lesson/StepComponents` (`StepContent`, `StepSection`, `Paragraph`, `List`, `InlineCode`, `ConceptLink`, `Callout`, `CardGrid`, `Card`, `CodeBlock`, `TradeoffTable`, `DecisionChallenge`). Do NOT copy another chapter's CSS or components; put chapter-specific widgets in `<id>/components/`. |
| 9 | **Manifest Registration** | Available chapters MUST have an entry in `src/archetypes/step-manifests.ts`; planned chapters MUST NOT. |
| 10 | **Honest Numbers** | Label illustrative/simulated results as illustrative. Never present hard-coded latency or cost as measured. |

### Stable IDs and saved progress
These IDs are persisted in `localStorage` and must never change once a chapter ships — renaming one silently orphans reader progress:

| ID | Persisted in | Renaming breaks |
|---|---|---|
| `metadata.id` / archetype ID | `archetypes[id]`, `lastVisited`, challenge namespace, route URLs | all chapter progress, bookmarks, SEO URLs |
| `LessonStep.id` | `archetypes[id].steps[stepId]` | that step's visited/completed state |
| `ChallengeDefinition.id` | `challenges[archetypeId][challengeId]` | that challenge's attempt/completion/understanding state |

Concept IDs and diagram node IDs are not persisted directly, but they are cross-referenced by the files above; changing them requires updating every reference (the validator will report the breakage).

### Challenge identity and persistence
Challenge IDs are **scoped to a chapter**, not global. Two chapters may both define `storage-strategy` and their saved attempts stay independent, because progress is stored as `challenges[archetypeId][challengeId]`.

- The archetype ID reaches the challenge through `LessonProvider` in `src/components/lesson/LessonContext.tsx`, which `LessonPage` wraps around the lesson. `<DecisionChallenge challenge={…} />` takes no chapter prop — do not add one.
- A challenge rendered **outside** a lesson has no archetype ID, so it is not persisted and reads no saved state. This is intentional: there is no chapter to attribute the attempt to.
- `<DecisionChallenge />` keys its inner state on `archetypeId:challengeId`, so swapping the rendered challenge in the same slot discards the previous selection and evaluation instead of carrying it over.
- Legacy saves (schema v1/v2) stored challenges flat; `migrateProgress` attributes them to `url-shortener`, the only chapter that shipped challenges before v3. See `docs/progress-format.md`.

### Field contract: required vs optional
`LessonStep` — required: `id`, `title`, `objective`. Optional: `shortTitle`, `diagramStateId`, `highlightedNodes`, `flowSequenceId`, `concepts`.
`ArchetypeMetadata` — required: `id`, `title`, `description`, `stage`, `sequence`, `availability`, `tags`. Optional: `estimatedMinutes`.
`DiagramNode` — required: `id`, `label`, `role`, `x`, `y`. Optional: `conceptId`, `description`, `spec`.
`ArchetypeModule` — required: `metadata`, `lesson`, `diagrams`, `conceptContext`, `stepComponents`. Optional: `challenges`.

Everything in the Part 3 templates is an **example**; the IDs shown (`rate-limiter`, `storage-strategy`, `allowed-flow`, `redis`) are illustrative placeholders, not values to copy verbatim.

### Executable authoring starter
`src/archetypes/__tests__/fixtures/rate-limiter/` is a minimal, test-only second chapter. Copy its structure when starting a chapter; replace the sample content and register your chapter in the catalog, registry, and manifest index. It is not published as a completed lesson.

All nine chapter file templates above are exact copies of the compiled fixture files. `authoring.test.tsx` checks them for drift; strict typechecking compiles them. Integration coverage exercises the shared lesson shell, home navigation, concept associations, progress isolation, and static route generation. Update the fixture and document examples together.
