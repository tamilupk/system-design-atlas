import type { LessonDefinition } from '@/types/lesson';

export const chatLesson: LessonDefinition = {
  "archetypeId": "chat",
  "title": "Real-Time Chat",
  "contentVersion": 4,
  "steps": [
    {
      "id": "requirements",
      "title": "Requirements & Delivery Promises",
      "shortTitle": "Requirements",
      "objective": "Turn chat product promises into explicit invariants and capacity estimates.",
      "diagramStateId": "baseline",
      "highlightedNodes": [
        "sender",
        "store"
      ],
      "concepts": []
    },
    {
      "id": "api-data",
      "title": "Protocol & Data Model",
      "shortTitle": "Protocol",
      "objective": "Define retry identity, authorization, history cursors, and receipt semantics.",
      "diagramStateId": "baseline",
      "highlightedNodes": [
        "service",
        "store"
      ],
      "concepts": [
        "idempotency",
        "database-index"
      ]
    },
    {
      "id": "baseline",
      "title": "Commit Before You Celebrate",
      "shortTitle": "Baseline",
      "objective": "Find the crash window between durable storage and live delivery.",
      "diagramStateId": "baseline",
      "highlightedNodes": [
        "service",
        "store"
      ],
      "concepts": [
        "transactional-outbox"
      ],
      "flowSequenceId": "commit"
    },
    {
      "id": "ordering",
      "title": "Ordering Without Exactly-Once Magic",
      "shortTitle": "Ordering",
      "objective": "Serialize conversation writes and distinguish durable uniqueness from duplicate delivery.",
      "diagramStateId": "durable",
      "highlightedNodes": [
        "owner",
        "store"
      ],
      "concepts": [
        "message-ordering",
        "idempotency"
      ],
      "flowSequenceId": "accepted"
    },
    {
      "id": "reconnect",
      "title": "Reconnect & Gap Recovery",
      "shortTitle": "Recovery",
      "objective": "Recover a contiguous device history across reconnects and bounded buffers.",
      "diagramStateId": "durable",
      "highlightedNodes": [
        "gateway",
        "store"
      ],
      "concepts": [
        "cache",
        "message-ordering"
      ],
      "flowSequenceId": "reconnect"
    },
    {
      "id": "presence-receipts",
      "title": "Presence, Devices & Receipts",
      "shortTitle": "Presence",
      "objective": "Separate ephemeral liveness from durable per-device delivery and read state.",
      "diagramStateId": "durable",
      "highlightedNodes": [
        "presence",
        "recipient"
      ],
      "concepts": [
        "cache",
        "idempotency"
      ]
    },
    {
      "id": "scaling",
      "title": "Millions of Sockets & Shards",
      "shortTitle": "Scaling",
      "objective": "Size gateway and shard capacity separately and move ownership safely.",
      "diagramStateId": "scaled",
      "highlightedNodes": [
        "ingress",
        "gateway",
        "owner"
      ],
      "concepts": [
        "load-balancer",
        "database-index"
      ]
    },
    {
      "id": "hot-room-fanout",
      "title": "One Hot Room, Millions of Deliveries",
      "shortTitle": "Fan-out",
      "objective": "Separate serial conversation order from parallel fan-out and choose an audience-specific delivery policy.",
      "diagramStateId": "scaled",
      "highlightedNodes": [
        "owner",
        "fanout",
        "recipient"
      ],
      "concepts": [
        "message-ordering",
        "transactional-outbox"
      ],
      "flowSequenceId": "accepted"
    },
    {
      "id": "operations",
      "title": "Backlogs, Retries & Recovery",
      "shortTitle": "Operations",
      "objective": "Detect delivery outages, bound retry pressure, and calculate recovery capacity.",
      "diagramStateId": "scaled",
      "highlightedNodes": [
        "store",
        "fanout"
      ],
      "concepts": [
        "transactional-outbox",
        "idempotency"
      ]
    },
    {
      "id": "resilience",
      "title": "The Region Went Dark",
      "shortTitle": "Resilience",
      "objective": "Preserve acknowledged writes and reject stale owners during partitions and failover.",
      "diagramStateId": "regional",
      "highlightedNodes": [
        "owner",
        "replica"
      ],
      "concepts": [
        "message-ordering",
        "transactional-outbox"
      ],
      "flowSequenceId": "failover"
    },
    {
      "id": "tradeoffs",
      "title": "Defend the Architecture",
      "shortTitle": "Trade-offs",
      "objective": "Choose consistency, fan-out, and retention policies under changing requirements.",
      "diagramStateId": "regional",
      "highlightedNodes": [
        "owner",
        "fanout"
      ],
      "concepts": [
        "cache",
        "transactional-outbox"
      ]
    },
    {
      "id": "recap",
      "title": "Interview Flight Recorder",
      "shortTitle": "Recap",
      "objective": "Reconstruct the design from invariants and answer adversarial follow-up probes.",
      "diagramStateId": "regional",
      "highlightedNodes": [
        "store",
        "replica"
      ],
      "concepts": []
    }
  ]
};
