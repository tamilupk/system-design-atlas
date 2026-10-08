import type { ChallengeDefinition } from '@/types/challenge';

export const urlShortenerChallenges: Record<string, ChallengeDefinition> = {
  "id-generation-strategy": {
    "id": "id-generation-strategy",
    "title": "Short-code generation at our actual scale",
    "scenario": "Plan for 100M creations/month: about 40/s average, 200/s peak, and up to 6B retained codes. Avoid obvious sequential enumeration without inventing a high-write bottleneck. Which baseline is justified?",
    "category": "ID Generation",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-random",
        "title": "7 Random Base62 Characters with DB Retry Loop",
        "description": "Uniform cryptographic randomness; enforce code uniqueness and retry generated collisions, separately from request idempotency.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "At 6B occupied codes, next-attempt collision probability is 6B / 62⁷ ≈ 0.17%. Lifetime collisions are expected and handled.",
          "impact": "Random secondary-index writes and retries remain costs; primary numeric IDs can stay sequential."
        },
        "seniorRationale": "This is simple at the stated write rate. Benchmark index locality before paying for an allocator and permutation. Public IDs still require separate authorization.",
        "tradeOffSummary": "Random secondary-index writes and retries remain costs; primary numeric IDs can stay sequential."
      },
      {
        "id": "opt-feistel",
        "title": "64-bit Sequence, Permutation, then Base62",
        "description": "Coordinate unique numeric inputs and use a reviewed permutation over a defined domain.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Uniqueness requires a correct allocator and bijection. Full 64-bit outputs may need 11 Base62 characters, not seven.",
          "impact": "Adds allocator, key management, domain sizing, and migration complexity without a demonstrated bottleneck here."
        },
        "seniorRationale": "This can fit other requirements, but a scrambled code still has random secondary-index locality. A custom few-round cipher does not prove unguessability or fixed latency.",
        "tradeOffSummary": "Adds allocator, key management, domain sizing, and migration complexity without a demonstrated bottleneck here."
      },
      {
        "id": "opt-md5",
        "title": "Truncated Hash of the Long URL",
        "description": "Deterministically map each destination to a short hash-derived code.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Different destinations can share a code; detect collisions and persist disambiguation. Duplicate URLs may need separate owner-specific links.",
          "impact": "Requires a collision protocol and a deliberate duplicate-destination policy."
        },
        "seniorRationale": "Birthday reasoning concerns the chance of any collision among many keys, not a sudden per-insert collision storm. Hashing the URL is not request idempotency.",
        "tradeOffSummary": "Requires a collision protocol and a deliberate duplicate-destination policy."
      },
      {
        "id": "opt-raw-seq",
        "title": "Raw Sequential ID + Base62",
        "description": "Encode a correctly allocated database sequence directly.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Simple unique allocation makes neighboring codes enumerable; encoding is not encryption.",
          "impact": "Coordination and allocation are straightforward initially, but public sequences expose enumeration."
        },
        "seniorRationale": "This is valid where predictability is acceptable. Our stated preference is to avoid easy sequential enumeration, not claim opaque IDs are security.",
        "tradeOffSummary": "Coordination and allocation are straightforward initially, but public sequences expose enumeration."
      }
    ]
  },
  "cache-eviction-ttl": {
    "id": "cache-eviction-ttl",
    "title": "Redis eviction and bounded freshness",
    "scenario": "500M mappings × 500 bytes = 250 GB logical storage. A proposed 10 GB cache fits at most 20M payloads before overhead, not 100M; that is capacity, not expected residency under our short validity window. Mutable links permit at most a 30-second internal stale-decision window.",
    "category": "Caching Strategy",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-lru-jitter",
        "title": "Evictable cache + downward-jittered validity",
        "description": "Use allkeys-LRU on the dedicated mapping cache, 24–30s absolute validity capped by expiry, and committed invalidation/version guards.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Eviction limits payload residency and jitter spreads independent expirations; actual hit rate depends on reuse within this short window.",
          "impact": "Short freshness costs misses; provision memory overhead and database fallback capacity."
        },
        "seniorRationale": "Keep quota/idempotency state outside the evictable cache. Check stored state and expiry on every hit; TTL alone does not close stale-fill races.",
        "tradeOffSummary": "Short freshness costs misses; provision memory overhead and database fallback capacity."
      },
      {
        "id": "opt-no-ttl",
        "title": "No freshness deadline; rely on LRU",
        "description": "Keep cached values until memory pressure evicts them.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "A frequently accessed old destination can stay cached indefinitely after a mutation if invalidation fails.",
          "impact": "Eviction is a memory policy, not a bound on mutable-data staleness."
        },
        "seniorRationale": "Explicit expires_at checks can enforce scheduled expiry even without Redis TTL, but they do not reveal a new delete or edit absent a freshness/invalidation protocol.",
        "tradeOffSummary": "Eviction is a memory policy, not a bound on mutable-data staleness."
      },
      {
        "id": "opt-noeviction",
        "title": "No eviction with fixed TTL",
        "description": "Reject new cache writes when the mapping cache reaches its memory limit.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Existing hits remain usable; rejected fills increase future misses. A correctly isolated fill failure does not invalidate the current database result.",
          "impact": "Needs extra memory headroom and careful handling of fill rejection; not an automatic database crash."
        },
        "seniorRationale": "Noeviction is a legitimate policy for other roles. For rebuildable mappings, evicting cold values is a better default than refusing all new candidates.",
        "tradeOffSummary": "Needs extra memory headroom and careful handling of fill rejection; not an automatic database crash."
      }
    ]
  },
  "replication-lag-race": {
    "id": "replication-lag-race",
    "title": "Read-after-create without a magic sticky window",
    "scenario": "A newly created link misses Redis and an async replica has not replayed its commit. The same system allows edits and deletions. Choose a redirect miss policy that works for anonymous visitors as well as creators.",
    "category": "Database Replication",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-hybrid-routing",
        "title": "Replica replay barrier + primary fallback",
        "description": "On a miss, obtain a primary WAL barrier, wait for replica replay, query a fresh snapshot, and use bounded primary fallback. Cache warmup is optional.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Replay-checked replica reads include commits before the barrier. Primary confirmation resolves replica misses; unavailable authority yields 503.",
          "impact": "Each miss adds a primary freshness probe and replica wait; bounded primary fallback preserves correctness but costs primary capacity."
        },
        "seniorRationale": "Creator sessions do not travel with shared links. A same-lineage replay barrier followed by a new query snapshot addresses stale positives as well as fresh creates; a missing-row fallback alone does not.",
        "tradeOffSummary": "Each miss adds a primary freshness probe and replica wait; bounded primary fallback preserves correctness but costs primary capacity."
      },
      {
        "id": "opt-sync-replication",
        "title": "Assume synchronous receipt makes every reader fresh",
        "description": "Enable synchronous_commit=on and query any replica after create.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Durable receipt is not necessarily replay visibility, and an arbitrary replica may not be a required synchronous participant.",
          "impact": "Must specify the acknowledged replicas and read routing; a setting alone is insufficient."
        },
        "seniorRationale": "A selected replay-confirmed standby with remote_apply or an explicit replay barrier can support the guarantee, at additional write/read latency and availability cost. Sync AZ durability remains valuable separately.",
        "tradeOffSummary": "Must specify the acknowledged replicas and read routing; a setting alone is insufficient."
      },
      {
        "id": "opt-retry-replica",
        "title": "Retry a fixed number of replica misses",
        "description": "Poll the same replica a few times and then report not found.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "A finite delay cannot guarantee catch-up under unbounded lag; real typos also consume extra queries.",
          "impact": "Additional latency and load still leave false negatives possible."
        },
        "seniorRationale": "Retries may help transient conditions but do not establish authority. Bound requests and choose a primary/barrier fallback rather than promising freshness after a fixed sleep.",
        "tradeOffSummary": "Additional latency and load still leave false negatives possible."
      }
    ]
  },
  "redirect-status-codes": {
    "id": "redirect-status-codes",
    "title": "302, browser caching, and mutable destinations",
    "scenario": "The service allows mutable destinations and expiry, and requires bounded propagation of edits. A colleague proposes caching redirects in browsers to reduce requests. Which policy matches the chosen product?",
    "category": "HTTP & Caching",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-302-cache-control",
        "title": "302 + no-store; cache internal mappings",
        "description": "Let GET requests reach the app, check validity, then redirect.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Both paths check state and expiry; internal mappings avoid database reads without letting browsers indefinitely reuse an old destination.",
          "impact": "Adds a network request per navigation; short internal validity also increases database misses."
        },
        "seniorRationale": "Temporary redirect status alone does not forbid caching. no-store prevents redirect reuse, while bounded internal validity and invalidation address mutable mappings. Analytics would require a separate recording policy; headers alone cannot provide complete counts.",
        "tradeOffSummary": "Adds a network request per navigation; short internal validity also increases database misses."
      },
      {
        "id": "opt-301-permanent",
        "title": "301 without explicit cache controls",
        "description": "Let browsers choose heuristic caching for a mutable destination.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Cached redirects can bypass the service, hiding requests and delaying edits or expiry enforcement.",
          "impact": "Fewer origin requests, but analytics gaps and stale destinations require a different product promise."
        },
        "seniorRationale": "Permanent redirects can use explicit headers too. The mismatch is unbounded reuse with our selected contract, not that every 301 is forbidden. A cacheable 302 shares the same risk.",
        "tradeOffSummary": "Fewer origin requests, but analytics gaps and stale destinations require a different product promise."
      }
    ]
  },
  "thundering-herd-mitigation": {
    "id": "thundering-herd-mitigation",
    "title": "A viral key expires across the fleet",
    "scenario": "At the illustrative 20,000 requests/s burst, many requests simultaneously miss one hot key. There are N application instances; Redis itself may also be unavailable.",
    "category": "High-Concurrency Caching",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-singleflight",
        "title": "Per-instance singleflight + bounded DB admission",
        "description": "Coalesce in-flight lookups locally and bound each instance’s share of fleet database concurrency; reject overload.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "One simultaneous cold-key wave can produce up to N database lookups, not one fleet-wide lookup. Later waves and different keys add work.",
          "impact": "Some requests fail or wait under overload; coalescing is load reduction, not stampede immunity."
        },
        "seniorRationale": "An optional distributed refresh lease helps while its store is healthy but cannot be the cache-outage safety net. Bound queues, deadlines, and retries independently.",
        "tradeOffSummary": "Some requests fail or wait under overload; coalescing is load reduction, not stampede immunity."
      },
      {
        "id": "opt-db-pool-expand",
        "title": "Expand every connection pool",
        "description": "Give every instance more database connections and add replicas without bounding misses.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "More capacity may help independent work, but uncontrolled duplicate queries can still consume the budget and worsen queueing.",
          "impact": "Higher cost and larger downstream concurrency, with no guaranteed tail-latency improvement."
        },
        "seniorRationale": "Capacity scaling is not inherently wrong; it must be measured and paired with admission. It does not eliminate duplicate hot-key work or replica consistency requirements.",
        "tradeOffSummary": "Higher cost and larger downstream concurrency, with no guaranteed tail-latency improvement."
      }
    ]
  },
  "rate-limiting-placement": {
    "id": "rate-limiting-placement",
    "title": "Rate limits and safety checks with clear owners",
    "scenario": "Bots send an illustrative 5,000 create requests/s and probe public codes. The diagram has redundant ingress and a stateless application fleet. Where do global quotas and destination checks belong?",
    "category": "Abuse Prevention",
    "interviewContext": "Defend the chosen guarantee, its authority, failure boundary, capacity assumptions, and operational cost.",
    "options": [
      {
        "id": "opt-edge-gateway",
        "title": "Ingress coarse limits + app-owned quotas and safety",
        "description": "Drop coarse floods at ingress; enforce authenticated shared quotas and synchronous reputation checks in the app before activation.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "Requests rejected early save backend work, while owner-aware policy remains consistent across app instances. No fixed rejection percentage is implied.",
          "impact": "Additional dependencies and false positives affect creation availability; quota identities are not unique humans."
        },
        "seniorRationale": "A load balancer does not automatically supply an API gateway or malware scanner. Explicitly configure ingress controls, replicated limiter state, and fail-closed creation when safety checks are unavailable.",
        "tradeOffSummary": "Additional dependencies and false positives affect creation availability; quota identities are not unique humans."
      },
      {
        "id": "opt-app-inmemory",
        "title": "Full quota independently on each app instance",
        "description": "Track a full per-owner allowance in a local map on every server.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative expected behavior; not a measured benchmark",
          "outcome": "With N instances each granting the full allowance, aggregate acceptance can approach N times the intended quota.",
          "impact": "Avoids a shared lookup but sacrifices global accuracy unless budgets are deliberately partitioned."
        },
        "seniorRationale": "Bounded per-instance shares are useful for emergency capacity control, but independent full quotas are not an exact global limit. Expiry and cardinality caps also matter.",
        "tradeOffSummary": "Avoids a shared lookup but sacrifices global accuracy unless budgets are deliberately partitioned."
      }
    ]
  }
};
