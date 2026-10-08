import type { LessonDefinition } from '@/types/lesson';

export const ticketBookingLesson: LessonDefinition = {
  "archetypeId": "ticket-booking",
  "title": "Ticket Booking",
  "contentVersion": 2,
  "steps": [
    {
      "id": "requirements",
      "title": "The Last Two Seats",
      "shortTitle": "Requirements",
      "objective": "Turn a ticket sale into explicit safety, fairness, and capacity assumptions.",
      "diagramStateId": "baseline",
      "concepts": [],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "hold"
    },
    {
      "id": "api-data",
      "title": "Identity Before Retries",
      "shortTitle": "API & Data",
      "objective": "Define ownership, retry identity, and durable inventory keys.",
      "diagramStateId": "baseline",
      "concepts": [
        "idempotency",
        "database-index"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "hold"
    },
    {
      "id": "baseline",
      "title": "One Database, One Decision",
      "shortTitle": "Baseline",
      "objective": "Build an atomic all-or-nothing reservation before adding distributed components.",
      "diagramStateId": "baseline",
      "concepts": [
        "database-index"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "hold"
    },
    {
      "id": "seat-contention",
      "title": "Two Buyers, One Winner",
      "shortTitle": "Contention",
      "objective": "Compare row locks and conditional writes under concentrated contention.",
      "diagramStateId": "baseline",
      "concepts": [
        "idempotency"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "hold"
    },
    {
      "id": "hold-expiry",
      "title": "The Timer Is Not the Authority",
      "shortTitle": "Hold Expiry",
      "objective": "Serialize expiry and checkout without stale workers releasing new holds.",
      "diagramStateId": "baseline",
      "concepts": [
        "database-index"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "hold"
    },
    {
      "id": "payments",
      "title": "Money and Seats Cannot Commit Together",
      "shortTitle": "Payments",
      "objective": "Coordinate payment uncertainty with a durable booking state machine.",
      "diagramStateId": "payments",
      "concepts": [
        "idempotency",
        "transactional-outbox"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "checkout"
    },
    {
      "id": "reconciliation",
      "title": "The Charge Succeeded. The Response Vanished.",
      "shortTitle": "Recovery",
      "objective": "Recover duplicate, delayed, and missing payment outcomes safely.",
      "diagramStateId": "payments",
      "concepts": [
        "idempotency",
        "transactional-outbox"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "checkout"
    },
    {
      "id": "availability",
      "title": "A Seat Map Is a Hint",
      "shortTitle": "Seat Maps",
      "objective": "Cache availability without granting ownership or leaking personal state.",
      "diagramStateId": "scaled",
      "concepts": [
        "cache"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "admitted"
    },
    {
      "id": "admission",
      "title": "A Million Fans at the Door",
      "shortTitle": "Admission",
      "objective": "Bound admission by downstream capacity while stating the fairness policy.",
      "diagramStateId": "scaled",
      "concepts": [
        "load-balancer"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "admitted"
    },
    {
      "id": "partitioning",
      "title": "One Event Is Your Hottest Shard",
      "shortTitle": "Partitioning",
      "objective": "Choose an inventory partition boundary and explain its limits.",
      "diagramStateId": "scaled",
      "concepts": [
        "database-index"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "admitted"
    },
    {
      "id": "regional-failure",
      "title": "Do Not Sell the Same Seat Twice",
      "shortTitle": "Failover",
      "objective": "Fence old writers and choose a safe response to uncertain regional history.",
      "diagramStateId": "regional",
      "concepts": [
        "transactional-outbox"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "fence"
    },
    {
      "id": "operations",
      "title": "Recover Without Causing the Next Outage",
      "shortTitle": "Operations",
      "objective": "Budget recovery capacity and detect safety failures across the booking lifecycle.",
      "diagramStateId": "regional",
      "concepts": [
        "transactional-outbox",
        "idempotency"
      ],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "fence"
    },
    {
      "id": "tradeoffs",
      "title": "Change the Product, Change the Design",
      "shortTitle": "Trade-offs",
      "objective": "Adapt the design for general admission, refunds, and multi-event purchases.",
      "diagramStateId": "regional",
      "concepts": [],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "fence"
    },
    {
      "id": "recap",
      "title": "Defend Every Promise",
      "shortTitle": "Recap",
      "objective": "Reconstruct the complete design and defend its failure boundaries.",
      "diagramStateId": "regional",
      "concepts": [],
      "highlightedNodes": [
        "inventory"
      ],
      "flowSequenceId": "fence"
    }
  ]
};
