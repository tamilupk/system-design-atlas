import type { DiagramDefinition } from '@/types/diagram';
import { appExamples, loadBalancerExamples, cacheExamples, primaryExamples, replicaExamples } from './implementation-examples';

export const urlShortenerDiagrams: DiagramDefinition = {
  "states": {
    "empty": {"id": "empty", "nodes": [], "edges": [], "flowSequences": []},
    "baseline": {
      "id": "baseline",
      "nodes": [
        {
          "id": "client",
          "label": "Client",
          "role": "client",
          "x": 100,
          "y": 200,
          "description": "Submit a stable create key; follow Location only after a successful redirect decision.",
          "spec": {
            "responsibilities": [
              "Retain create-operation identity across ambiguous responses.",
              "Follow Location using ordinary HTTP semantics.",
              "Treat a public short code as an identifier, never an access credential."
            ],
            "inputsAndProtocols": ["User navigation or API SDK over HTTPS."],
            "outputsAndCodes": [
              "POST /api/urls with stable Idempotency-Key; GET /:code follows 302 Location; owner PATCH/DELETE uses If-Match."
            ],
            "stateAndPersistence": "Client retains retry identity; redirect responses use no-store.",
            "failureModes": [
              "Lost create response: recover with the original key.",
              "A lost redirect response can be retried; a redirect never proves that the destination loaded."
            ],
            "tradeoffs": ["A public code is not authorization."]
          }
        },
        {
          "id": "app-server",
          "label": "App Server",
          "role": "service",
          "x": 370,
          "y": 200,
          "description": "Validate, scan, and persist idempotent creates; query the primary and validate mappings before 302.",
          "spec": {
            "responsibilities": [
              "Authenticate creates and mutations, enforce quotas, validate and check destination reputation before activation.",
              "Persist code uniqueness and request identity in one mapping transaction; version mutations and append invalidation obligations.",
              "Validate state and expiry, then return 302 + no-store."
            ],
            "inputsAndProtocols": ["HTTPS from client or ingress; authenticated PostgreSQL connections."],
            "outputsAndCodes": [
              "201 created; 302 redirect; 404 unknown/inactive; 409 conflict; 412 stale mutation version; 429 quota exceeded; 503 dependency/overload."
            ],
            "stateAndPersistence": "Stateless request handlers; mappings and operation results live in PostgreSQL. Reputation checks and quota state are collapsed dependencies; multi-instance quotas require a separate replicated limiter store.",
            "failureModes": [
              "Unknown mapping commit: retain the request key and recover the stored result.",
              "Bound per-instance singleflight, connection pools and fleet DB admission; reject excess work instead of multiplying fallback queries."
            ],
            "tradeoffs": ["Primary lookup gives authoritative mappings; cache-aside can reduce lookups but adds bounded staleness."]
          },
          "implementationExamples": appExamples,
          "conceptId": "idempotency"
        },
        {
          "id": "database",
          "label": "Database",
          "role": "database",
          "x": 640,
          "y": 200,
          "description": "Own mappings, alias uniqueness, request results, and mutation invalidation outbox.",
          "spec": {
            "responsibilities": [
              "Own mapping state, case-sensitive code uniqueness and owner/version checks.",
              "Commit create results with the idempotency ledger; commit mutation outbox records with state changes.",
              "Serve authoritative indexed lookups; retain alias tombstones and test backup recovery."
            ],
            "inputsAndProtocols": ["Authenticated PostgreSQL SQL; WAL streaming to explicitly configured standbys."],
            "outputsAndCodes": ["Committed row/result or unique conflict; query/commit timeout may leave outcome unknown."],
            "stateAndPersistence": "Synchronous AZ durability configured for acknowledged commits; HA copies collapsed into this box.",
            "failureModes": [
              "Primary loss: fence it and promote only a standby containing acknowledged history.",
              "Cache outage or cold start: bounded admission protects pools; reject excess reads.",
              "All synchronous copies lost: archive RPO can permit data loss; restore drills establish recovery time."
            ],
            "tradeoffs": [
              "Unique indexes, retained rows and authoritative lookups cost storage and capacity; benchmark at retained size."
            ]
          },
          "implementationExamples": primaryExamples,
          "conceptId": "database-index"
        }
      ],
      "edges": [
        {
          "id": "client-to-app",
          "from": "client",
          "to": "app-server",
          "label": "Request",
          "style": "solid",
          "labelPosition": 0.5
        },
        {"id": "app-to-db", "from": "app-server", "to": "database", "label": "SQL", "style": "solid", "labelPosition": 0.5},
        {"id": "db-to-app", "from": "database", "to": "app-server", "style": "dashed", "labelPosition": 0.5},
        {"id": "app-to-client", "from": "app-server", "to": "client", "style": "dashed", "labelPosition": 0.5}
      ],
      "flowSequences": [
        {
          "id": "create-flow",
          "title": "Create Short URL",
          "events": [
            {
              "label": "Validate and scan",
              "description": "Authenticate, rate-limit, validate alias/URL/expiry, and check reputation before activation.",
              "edgeIds": ["client-to-app"],
              "highlightNodeIds": ["client", "app-server"]
            },
            {
              "label": "Atomic creation",
              "description": "Claim request identity; generate or claim code; commit mapping and response atomically.",
              "edgeIds": ["app-to-db"],
              "highlightNodeIds": ["app-server", "database"]
            },
            {
              "label": "Durable result",
              "description": "Recover identical retries from the committed request ledger.",
              "edgeIds": ["db-to-app"],
              "highlightNodeIds": ["database", "app-server"]
            },
            {
              "label": "201 or replay",
              "description": "Return the committed result; custom-alias conflict is 409.",
              "edgeIds": ["app-to-client"],
              "highlightNodeIds": ["client"]
            }
          ]
        },
        {
          "id": "redirect-flow",
          "title": "Redirect Request",
          "events": [
            {
              "label": "GET /:code",
              "description": "No browser redirect cache hides this request.",
              "edgeIds": ["client-to-app"],
              "highlightNodeIds": ["client", "app-server"]
            },
            {
              "label": "Lookup mapping",
              "description": "Query authoritative state and expiry.",
              "edgeIds": ["app-to-db"],
              "highlightNodeIds": ["database"]
            },
            {
              "label": "Validate result",
              "description": "Reject absent/inactive/expired mappings with no-store 404.",
              "edgeIds": ["db-to-app"],
              "highlightNodeIds": ["app-server"]
            },
            {
              "label": "302 + no-store",
              "description": "Return Location with no-store; a redirect does not prove the destination loaded.",
              "edgeIds": ["app-to-client"],
              "highlightNodeIds": ["client"]
            }
          ]
        }
      ]
    },
    "with-cache": {
      "id": "with-cache",
      "nodes": [
        {
          "id": "client",
          "label": "Client",
          "role": "client",
          "x": 100,
          "y": 200,
          "description": "Submit a stable create key; follow Location only after a successful redirect decision.",
          "spec": {
            "responsibilities": [
              "Retain create-operation identity across ambiguous responses.",
              "Follow Location using ordinary HTTP semantics.",
              "Treat a public short code as an identifier, never an access credential."
            ],
            "inputsAndProtocols": ["User navigation or API SDK over HTTPS."],
            "outputsAndCodes": [
              "POST /api/urls with stable Idempotency-Key; GET /:code follows 302 Location; owner PATCH/DELETE uses If-Match."
            ],
            "stateAndPersistence": "Client retains retry identity; redirect responses use no-store.",
            "failureModes": [
              "Lost create response: recover with the original key.",
              "A lost redirect response can be retried; a redirect never proves that the destination loaded."
            ],
            "tradeoffs": ["A public code is not authorization."]
          }
        },
        {
          "id": "app-server",
          "label": "App Server",
          "role": "service",
          "x": 370,
          "y": 200,
          "description": "Validate and scan before activation; atomically persist create idempotency; check redirect validity before 302.",
          "spec": {
            "responsibilities": [
              "Authenticate creates and mutations, enforce quotas, validate and check destination reputation before activation.",
              "Persist code uniqueness and request identity in one mapping transaction; version mutations and append invalidation obligations.",
              "Validate state and expiry, then return 302 + no-store."
            ],
            "inputsAndProtocols": ["HTTPS from client or ingress; authenticated PostgreSQL connections.", "Redis RESP for internal mappings."],
            "outputsAndCodes": [
              "201 created; 302 redirect; 404 unknown/inactive; 409 conflict; 412 stale mutation version; 429 quota exceeded; 503 dependency/overload."
            ],
            "stateAndPersistence": "Stateless request handlers; mappings and operation results live in PostgreSQL. Reputation checks and quota state are collapsed dependencies; multi-instance quotas require a separate replicated limiter store. Redis holds only rebuildable mappings; a retrying outbox relay runs in the application tier.",
            "failureModes": [
              "Unknown mapping commit: retain the request key and recover the stored result.",
              "Bound per-instance singleflight, connection pools and fleet DB admission; reject excess work instead of multiplying fallback queries."
            ],
            "tradeoffs": ["Primary lookup gives authoritative mappings; cache-aside can reduce lookups but adds bounded staleness."]
          },
          "implementationExamples": appExamples,
          "conceptId": "idempotency"
        },
        {
          "id": "database",
          "label": "Database",
          "role": "database",
          "x": 640,
          "y": 200,
          "description": "Own mappings, alias uniqueness, request results, and mutation invalidation outbox.",
          "spec": {
            "responsibilities": [
              "Own mapping state, case-sensitive code uniqueness and owner/version checks.",
              "Commit create results with the idempotency ledger; commit mutation outbox records with state changes.",
              "Serve authoritative indexed lookups; retain alias tombstones and test backup recovery."
            ],
            "inputsAndProtocols": ["Authenticated PostgreSQL SQL; WAL streaming to explicitly configured standbys."],
            "outputsAndCodes": ["Committed row/result or unique conflict; query/commit timeout may leave outcome unknown."],
            "stateAndPersistence": "Synchronous AZ durability configured for acknowledged commits; HA copies collapsed into this box.",
            "failureModes": [
              "Primary loss: fence it and promote only a standby containing acknowledged history.",
              "Cache outage or cold start: bounded admission protects pools; reject excess reads.",
              "All synchronous copies lost: archive RPO can permit data loss; restore drills establish recovery time."
            ],
            "tradeoffs": [
              "Unique indexes, retained rows and authoritative lookups cost storage and capacity; benchmark at retained size."
            ]
          },
          "implementationExamples": primaryExamples,
          "conceptId": "database-index"
        },
        {
          "id": "cache-node",
          "label": "Cache (Redis)",
          "role": "cache",
          "x": 370,
          "y": 60,
          "description": "Cache mapping state, version, expiry, and absolute valid_until; check them on every hit.",
          "spec": {
            "responsibilities": [
              "Store rebuildable freshness-checked mappings with state, version, expiry and absolute valid_until.",
              "Evict under memory pressure; apply downward-jittered 24–30s validity bounded by expiry.",
              "Atomically invalidate and advance a version floor; guard fills against retained floors."
            ],
            "inputsAndProtocols": ["Authenticated Redis RESP; bounded GET and atomic invalidation/fill commands."],
            "outputsAndCodes": ["Typed mapping or miss; timeout/error is distinct from a miss."],
            "stateAndPersistence": "Dedicated evictable mapping cache: 24–30s validity bounded by expiry; per-code invalidation version floors.",
            "failureModes": [
              "Outage/cold start: app limits primary fallback and sheds overload.",
              "Evicted version floor or delayed invalidation: original absolute validity still bounds stale decisions.",
              "Clock uncertainty or expired validity: reject cache reuse rather than extending freshness."
            ],
            "tradeoffs": ["Short freshness raises misses; no guaranteed hit ratio or sub-millisecond p99."]
          },
          "implementationExamples": cacheExamples,
          "conceptId": "cache"
        }
      ],
      "edges": [
        {
          "id": "client-to-app",
          "from": "client",
          "to": "app-server",
          "label": "Request",
          "style": "solid",
          "labelPosition": 0.5
        },
        {"id": "app-to-db", "from": "app-server", "to": "database", "label": "SQL", "style": "solid", "labelPosition": 0.5},
        {"id": "db-to-app", "from": "database", "to": "app-server", "style": "dashed", "labelPosition": 0.5},
        {"id": "app-to-client", "from": "app-server", "to": "client", "style": "dashed", "labelPosition": 0.5},
        {
          "id": "app-to-cache",
          "from": "app-server",
          "to": "cache-node",
          "label": "GET / fill",
          "style": "solid",
          "labelPosition": 0.3
        },
        {"id": "cache-to-app", "from": "cache-node", "to": "app-server", "style": "dashed", "labelPosition": 0.3}
      ],
      "flowSequences": [
        {
          "id": "cache-hit-flow",
          "title": "Cache Hit",
          "events": [
            {
              "label": "GET /:code",
              "description": "App receives an observable request.",
              "edgeIds": ["client-to-app"],
              "highlightNodeIds": ["client", "app-server"]
            },
            {
              "label": "Check cache",
              "description": "Read mapping state and absolute validity.",
              "edgeIds": ["app-to-cache"],
              "highlightNodeIds": ["cache-node"]
            },
            {
              "label": "Cache hit",
              "description": "Validate cached entry.",
              "edgeIds": ["cache-to-app"],
              "highlightNodeIds": ["app-server"]
            },
            {
              "label": "302 + no-store",
              "description": "Send Location after validating state and expiry.",
              "edgeIds": ["app-to-client"],
              "highlightNodeIds": ["client"]
            }
          ]
        },
        {
          "id": "cache-miss-flow",
          "title": "Cache Miss & Populate",
          "events": [
            {
              "label": "GET /:code",
              "description": "App receives an observable request.",
              "edgeIds": ["client-to-app"],
              "highlightNodeIds": ["client", "app-server"]
            },
            {
              "label": "Check cache",
              "description": "Read mapping state and absolute validity.",
              "edgeIds": ["app-to-cache"],
              "highlightNodeIds": ["cache-node"]
            },
            {
              "label": "Cache miss",
              "description": "No usable cached entry.",
              "edgeIds": ["cache-to-app"],
              "highlightNodeIds": ["app-server"]
            },
            {
              "label": "Primary lookup",
              "description": "Bounded lookup; no arbitrary replica-lag assumption.",
              "edgeIds": ["app-to-db"],
              "highlightNodeIds": ["database"]
            },
            {
              "label": "Validate mapping",
              "description": "Check ACTIVE and expiry before deciding.",
              "edgeIds": ["db-to-app"],
              "highlightNodeIds": ["app-server"]
            },
            {
              "label": "Bounded fill",
              "description": "Best-effort fill with original absolute validity; reject old invalidated versions.",
              "edgeIds": ["app-to-cache"],
              "highlightNodeIds": ["cache-node"]
            },
            {
              "label": "302 + no-store",
              "description": "Send Location after validating state and expiry.",
              "edgeIds": ["app-to-client"],
              "highlightNodeIds": ["client"]
            }
          ]
        }
      ]
    },
    "scaled": {
      "id": "scaled",
      "edgeLabelVisibility": "selected-flow",
      "nodes": [
        {
          "id": "client",
          "label": "Client",
          "role": "client",
          "x": 70,
          "y": 220,
          "description": "Submit a stable create key; follow Location only after a successful redirect decision.",
          "spec": {
            "responsibilities": [
              "Retain create-operation identity across ambiguous responses.",
              "Follow Location using ordinary HTTP semantics.",
              "Treat a public short code as an identifier, never an access credential."
            ],
            "inputsAndProtocols": ["User navigation or API SDK over HTTPS."],
            "outputsAndCodes": [
              "POST /api/urls with stable Idempotency-Key; GET /:code follows 302 Location; owner PATCH/DELETE uses If-Match."
            ],
            "stateAndPersistence": "Client retains retry identity; redirect responses use no-store.",
            "failureModes": [
              "Lost create response: recover with the original key.",
              "A lost redirect response can be retried; a redirect never proves that the destination loaded."
            ],
            "tradeoffs": ["A public code is not authorization."]
          }
        },
        {
          "id": "load-balancer-node",
          "label": "Load Balancer",
          "role": "loadbalancer",
          "x": 240,
          "y": 220,
          "description": "Redundant ingress handles TLS, health routing, and configured coarse flood controls.",
          "spec": {
            "responsibilities": [
              "Terminate TLS and forward to healthy application instances.",
              "Apply explicitly configured coarse connection/IP limits.",
              "Preserve request identity and avoid caching redirect responses."
            ],
            "inputsAndProtocols": ["Public HTTPS on port 443; redundant regional ingress."],
            "outputsAndCodes": [
              "Authenticated HTTP forwarding to apps; relay Location and Cache-Control unchanged; explicit overload or unavailable response."
            ],
            "stateAndPersistence": "No redirect caching; application owns authenticated global quotas.",
            "failureModes": [
              "Ingress failure: redundancy and tested health routing; no single proxy availability assumption.",
              "Unsafe retries can amplify creates or decisions; preserve create keys and limit retry budgets."
            ],
            "tradeoffs": ["Additional hop; measure latency rather than assuming it negligible."]
          },
          "implementationExamples": loadBalancerExamples,
          "conceptId": "load-balancer"
        },
        {
          "id": "app-server-1",
          "label": "App Server 1",
          "role": "service",
          "x": 430,
          "y": 150,
          "description": "Validate and scan before activation; atomically persist create idempotency; check redirect validity before 302.",
          "spec": {
            "responsibilities": [
              "Authenticate creates and mutations, enforce quotas, validate and check destination reputation before activation.",
              "Persist code uniqueness and request identity in one mapping transaction; version mutations and append invalidation obligations.",
              "Validate state and expiry, then return 302 + no-store.",
              "Write mappings to primary; gate replica lookups on replay of a primary WAL barrier and use bounded primary fallback."
            ],
            "inputsAndProtocols": ["HTTPS from client or ingress; authenticated PostgreSQL connections.", "Redis RESP for internal mappings."],
            "outputsAndCodes": [
              "201 created; 302 redirect; 404 unknown/inactive; 409 conflict; 412 stale mutation version; 429 quota exceeded; 503 dependency/overload."
            ],
            "stateAndPersistence": "Stateless request handlers; mappings and operation results live in PostgreSQL. Reputation checks and quota state are collapsed dependencies; multi-instance quotas require a separate replicated limiter store. Redis holds only rebuildable mappings; a retrying outbox relay runs in the application tier.",
            "failureModes": [
              "Unknown mapping commit: retain the request key and recover the stored result.",
              "Bound per-instance singleflight, connection pools and fleet DB admission; reject excess work instead of multiplying fallback queries."
            ],
            "tradeoffs": [
              "Replay barriers preserve mutable-link freshness while offloading indexed lookups; primary probes, replay waits, and fallback remain costs."
            ]
          },
          "implementationExamples": appExamples,
          "conceptId": "idempotency"
        },
        {
          "id": "app-server-2",
          "label": "App Server 2",
          "role": "service",
          "x": 430,
          "y": 290,
          "description": "Validate and scan before activation; atomically persist create idempotency; check redirect validity before 302.",
          "spec": {
            "responsibilities": [
              "Authenticate creates and mutations, enforce quotas, validate and check destination reputation before activation.",
              "Persist code uniqueness and request identity in one mapping transaction; version mutations and append invalidation obligations.",
              "Validate state and expiry, then return 302 + no-store.",
              "Write mappings to primary; gate replica lookups on replay of a primary WAL barrier and use bounded primary fallback."
            ],
            "inputsAndProtocols": ["HTTPS from client or ingress; authenticated PostgreSQL connections.", "Redis RESP for internal mappings."],
            "outputsAndCodes": [
              "201 created; 302 redirect; 404 unknown/inactive; 409 conflict; 412 stale mutation version; 429 quota exceeded; 503 dependency/overload."
            ],
            "stateAndPersistence": "Stateless request handlers; mappings and operation results live in PostgreSQL. Reputation checks and quota state are collapsed dependencies; multi-instance quotas require a separate replicated limiter store. Redis holds only rebuildable mappings; a retrying outbox relay runs in the application tier.",
            "failureModes": [
              "Unknown mapping commit: retain the request key and recover the stored result.",
              "Bound per-instance singleflight, connection pools and fleet DB admission; reject excess work instead of multiplying fallback queries."
            ],
            "tradeoffs": [
              "Replay barriers preserve mutable-link freshness while offloading indexed lookups; primary probes, replay waits, and fallback remain costs."
            ]
          },
          "implementationExamples": appExamples,
          "conceptId": "idempotency"
        },
        {
          "id": "cache-node",
          "label": "Cache (Redis)",
          "role": "cache",
          "x": 660,
          "y": 70,
          "description": "Cache mapping state, version, expiry, and absolute valid_until; check them on every hit.",
          "spec": {
            "responsibilities": [
              "Store rebuildable freshness-checked mappings with state, version, expiry and absolute valid_until.",
              "Evict under memory pressure; apply downward-jittered 24–30s validity bounded by expiry.",
              "Atomically invalidate and advance a version floor; guard fills against retained floors."
            ],
            "inputsAndProtocols": ["Authenticated Redis RESP; bounded GET and atomic invalidation/fill commands."],
            "outputsAndCodes": ["Typed mapping or miss; timeout/error is distinct from a miss."],
            "stateAndPersistence": "Dedicated evictable mapping cache: 24–30s validity bounded by expiry; per-code invalidation version floors.",
            "failureModes": [
              "Outage/cold start: app limits primary fallback and sheds overload.",
              "Evicted version floor or delayed invalidation: original absolute validity still bounds stale decisions.",
              "Clock uncertainty or expired validity: reject cache reuse rather than extending freshness."
            ],
            "tradeoffs": ["Short freshness raises misses; no guaranteed hit ratio or sub-millisecond p99."]
          },
          "implementationExamples": cacheExamples,
          "conceptId": "cache"
        },
        {
          "id": "db-primary",
          "label": "DB Primary",
          "role": "database",
          "x": 660,
          "y": 220,
          "description": "Own mappings, alias uniqueness, request results, and mutation invalidation outbox.",
          "spec": {
            "responsibilities": [
              "Own mapping state, case-sensitive code uniqueness and owner/version checks.",
              "Commit create results with the idempotency ledger; commit mutation outbox records with state changes.",
              "Serve baseline misses, scaled WAL-position probes and fallback lookups; retain alias tombstones and test backup recovery."
            ],
            "inputsAndProtocols": ["Authenticated PostgreSQL SQL; WAL streaming to explicitly configured standbys."],
            "outputsAndCodes": ["Committed row/result or unique conflict; query/commit timeout may leave outcome unknown."],
            "stateAndPersistence": "Synchronous AZ durability configured for acknowledged commits; HA copies collapsed into this box.",
            "failureModes": [
              "Primary loss: fence it and promote only a standby containing acknowledged history.",
              "Cache outage or cold start: bounded admission protects pools; reject excess reads.",
              "All synchronous copies lost: archive RPO can permit data loss; restore drills establish recovery time."
            ],
            "tradeoffs": ["Unique indexes, per-miss WAL probes, and fallback queries cost primary capacity; benchmark at retained size."]
          },
          "implementationExamples": primaryExamples,
          "conceptId": "database-index"
        },
        {
          "id": "db-replica",
          "label": "DB Replica",
          "role": "database",
          "x": 660,
          "y": 370,
          "description": "Read replica for indexed redirect lookups after replay reaches a current-primary WAL barrier; bounded fallback uses the primary.",
          "spec": {
            "responsibilities": [
              "Replay primary WAL asynchronously.",
              "Serve indexed redirect lookups when replica freshness satisfies the product contract.",
              "Expose replay progress; fall back to primary or fail when freshness cannot be established."
            ],
            "inputsAndProtocols": ["PostgreSQL WAL streaming; replay-position checks and authenticated read-only SQL for redirect lookup."],
            "outputsAndCodes": [
              "Replay position and mapping results; the app starts a fresh query snapshot only after its same-lineage barrier is replayed."
            ],
            "stateAndPersistence": "WAL replay can lag without a fixed bound; not the synchronous HA standby.",
            "failureModes": [
              "Lag delays barrier satisfaction; wait within budget or fall back to primary. Unguarded positive results cannot meet the mutation freshness contract.",
              "Promotion can lose acknowledged history; the async copy is not automatically an eligible synchronous HA standby."
            ],
            "tradeoffs": ["Offloads suitable queries, adds storage, and still requires freshness-aware routing."]
          },
          "implementationExamples": replicaExamples,
          "conceptId": "database-index"
        }
      ],
      "edges": [
        {"id": "client-to-lb", "from": "client", "to": "load-balancer-node", "label": "HTTPS"},
        {"id": "lb-to-app1", "from": "load-balancer-node", "to": "app-server-1", "label": "Route", "labelPosition": 0.5},
        {"id": "app1-to-cache", "from": "app-server-1", "to": "cache-node", "label": "GET/SET", "labelPosition": 0.35},
        {"id": "app1-to-db", "from": "app-server-1", "to": "db-primary", "label": "Write", "labelPosition": 0.45},
        {
          "id": "app1-to-replica",
          "from": "app-server-1",
          "to": "db-replica",
          "label": "Read",
          "style": "dashed",
          "labelPosition": 0.22
        },
        {"id": "lb-to-app2", "from": "load-balancer-node", "to": "app-server-2", "label": "Route", "labelPosition": 0.5},
        {"id": "app2-to-cache", "from": "app-server-2", "to": "cache-node", "label": "GET/SET", "labelPosition": 0.78},
        {"id": "app2-to-db", "from": "app-server-2", "to": "db-primary", "label": "Write", "labelPosition": 0.55},
        {
          "id": "app2-to-replica",
          "from": "app-server-2",
          "to": "db-replica",
          "label": "Read",
          "style": "dashed",
          "labelPosition": 0.4
        },
        {
          "id": "db-to-replica",
          "from": "db-primary",
          "to": "db-replica",
          "label": "Replication",
          "style": "dashed",
          "labelPosition": 0.5
        },
        {"id": "lb-to-client", "visibility": "active-event", "from": "load-balancer-node", "to": "client", "style": "dashed"},
        {"id": "app1-to-lb", "visibility": "active-event", "from": "app-server-1", "to": "load-balancer-node", "style": "dashed"},
        {"id": "cache-to-app1", "visibility": "active-event", "from": "cache-node", "to": "app-server-1", "style": "dashed"},
        {"id": "db-to-app1", "visibility": "active-event", "from": "db-primary", "to": "app-server-1", "style": "dashed"},
        {"id": "replica-to-app1", "visibility": "active-event", "from": "db-replica", "to": "app-server-1", "style": "dashed"},
        {"id": "app2-to-lb", "visibility": "active-event", "from": "app-server-2", "to": "load-balancer-node", "style": "dashed"},
        {"id": "cache-to-app2", "visibility": "active-event", "from": "cache-node", "to": "app-server-2", "style": "dashed"},
        {"id": "db-to-app2", "visibility": "active-event", "from": "db-primary", "to": "app-server-2", "style": "dashed"},
        {"id": "replica-to-app2", "visibility": "active-event", "from": "db-replica", "to": "app-server-2", "style": "dashed"}
      ],
      "flowSequences": [
        {
          "id": "write-flow",
          "title": "1. Write Path: URL Creation",
          "events": [
            {
              "label": "POST /api/urls",
              "edgeIds": ["client-to-lb"],
              "highlightNodeIds": ["client", "load-balancer-node"],
              "description": "Send the long URL and a stable Idempotency-Key."
            },
            {
              "label": "Route to App Server 1",
              "edgeIds": ["lb-to-app1"],
              "highlightNodeIds": ["app-server-1"],
              "description": "Forward the create request to a healthy app instance."
            },
            {
              "label": "Validate and generate",
              "edgeIds": [],
              "highlightNodeIds": ["app-server-1"],
              "description": "Authenticate, quota-check, validate, check reputation, and generate a random Base62 code."
            },
            {
              "label": "INSERT into DB Primary",
              "edgeIds": ["app1-to-db", "db-to-app1"],
              "highlightNodeIds": ["app-server-1", "db-primary"],
              "description": "Atomically commit mapping and idempotency result; acknowledge only the configured durability boundary."
            },
            {
              "label": "Warm cache and return 201",
              "edgeIds": ["app1-to-cache", "app1-to-lb", "lb-to-client"],
              "highlightNodeIds": ["app-server-1", "cache-node", "client"],
              "description": "Return the committed short URL through ingress. Optional warmup uses validity anchored before creation, never a fresh deadline on retries."
            }
          ]
        },
        {
          "id": "read-cache-hit",
          "title": "2. Read Path: Cache Hit",
          "events": [
            {
              "label": "GET /:code",
              "edgeIds": ["client-to-lb"],
              "highlightNodeIds": ["client", "load-balancer-node"],
              "description": "Request a public short link."
            },
            {
              "label": "Route to App Server 1",
              "edgeIds": ["lb-to-app1"],
              "highlightNodeIds": ["app-server-1"],
              "description": "Forward to a healthy app instance."
            },
            {
              "label": "Redis cache hit",
              "edgeIds": ["app1-to-cache", "cache-to-app1"],
              "highlightNodeIds": ["app-server-1", "cache-node"],
              "description": "Resolve the cached mapping and check state, expiry, and absolute validity."
            },
            {
              "label": "302 Found redirect",
              "edgeIds": ["app1-to-lb", "lb-to-client"],
              "highlightNodeIds": ["app-server-1", "client"],
              "description": "Return Location with Cache-Control: no-store."
            }
          ]
        },
        {
          "id": "read-cache-miss",
          "title": "3. Read Path: Cache Miss & Populate",
          "events": [
            {
              "label": "GET /:code",
              "edgeIds": ["client-to-lb"],
              "highlightNodeIds": ["client", "load-balancer-node"],
              "description": "Request a cold short link."
            },
            {
              "label": "Route to App Server 2",
              "edgeIds": ["lb-to-app2"],
              "highlightNodeIds": ["app-server-2"],
              "description": "Forward to a healthy app instance."
            },
            {
              "label": "Cache miss",
              "edgeIds": ["app2-to-cache", "cache-to-app2"],
              "highlightNodeIds": ["app-server-2", "cache-node"],
              "description": "No usable mapping is cached."
            },
            {
              "label": "Query Read Replica",
              "edgeIds": ["app2-to-replica", "replica-to-app2"],
              "highlightNodeIds": ["app-server-2", "db-replica"],
              "description": "Acquire a current-primary WAL barrier, wait for same-lineage replica replay, then query a fresh snapshot; fall back to primary within the total lookup budget."
            },
            {
              "label": "Populate cache",
              "edgeIds": ["app2-to-cache"],
              "highlightNodeIds": ["app-server-2", "cache-node"],
              "description": "Check state and expiry; retain absolute validity from before barrier acquisition. Never reset it on fill retries."
            },
            {
              "label": "Redirect client",
              "edgeIds": ["app2-to-lb", "lb-to-client"],
              "highlightNodeIds": ["app-server-2", "client"],
              "description": "Return 302 + no-store for an acceptable mapping; unresolved freshness requires fallback or 503."
            }
          ]
        },
        {
          "id": "replication-flow",
          "title": "4. Asynchronous DB Replication",
          "events": [
            {
              "label": "Write transaction on Primary",
              "edgeIds": ["app1-to-db"],
              "highlightNodeIds": ["db-primary"],
              "description": "The primary receives the mapping and request-identity transaction; WAL precedes the durable acknowledgement."
            },
            {
              "label": "Write-Ahead Log",
              "edgeIds": [],
              "highlightNodeIds": ["db-primary"],
              "description": "PostgreSQL records the transaction and commit in WAL; acknowledge only after the configured synchronous durability boundary. The separate read replica is asynchronous."
            },
            {
              "label": "Streaming WAL replication",
              "edgeIds": ["db-to-replica"],
              "highlightNodeIds": ["db-primary", "db-replica"],
              "description": "Stream changes asynchronously to the read replica."
            },
            {
              "label": "Replica applies WAL",
              "edgeIds": [],
              "highlightNodeIds": ["db-replica"],
              "description": "Read visibility follows replay; lag must be measured and is not universally bounded."
            }
          ]
        },
        {
          "id": "failover-flow",
          "title": "5. Degraded Fallback & Circuit Breaker",
          "events": [
            {
              "label": "Cache blip or outage",
              "edgeIds": ["app1-to-cache"],
              "highlightNodeIds": ["cache-node"],
              "description": "Redis times out within the illustrative 20ms budget."
            },
            {
              "label": "Bound fallback work",
              "edgeIds": [],
              "highlightNodeIds": ["app-server-1", "app-server-2"],
              "description": "Use circuit breaking, per-instance singleflight, bounded queues and fleet database admission."
            },
            {
              "label": "Fallback to Read Replica",
              "edgeIds": ["app1-to-replica", "app2-to-replica"],
              "highlightNodeIds": ["app-server-1", "app-server-2", "db-replica"],
              "description": "Use replay-checked replica reads with primary fallback, bounded queues and one overall lookup deadline; fail if freshness cannot be established."
            },
            {
              "label": "Redirect or explicit failure",
              "edgeIds": ["app1-to-lb", "lb-to-client"],
              "highlightNodeIds": ["client"],
              "description": "Available, acceptable mappings may redirect; overload or uncertain freshness returns 503. Recovery is not seamless by assumption."
            }
          ]
        }
      ]
    }
  }
};
