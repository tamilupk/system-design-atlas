import type { ChallengeMap } from '@/types/challenge';

export const ticketBookingChallenges: ChallengeMap = {
  "seat-race": {
    "id": "seat-race",
    "title": "Who owns the last pair?",
    "category": "Correctness under failure",
    "scenario": "Two requests target the same two assigned seats. Both seat maps showed AVAILABLE. The requirement is all-or-nothing ownership on one event shard.",
    "interviewContext": "Senior and staff interviews test the authority, crash window, recovery mechanism, and customer cost behind your choice.",
    "options": [
      {
        "id": "transaction",
        "title": "Arbitrate in the inventory transaction",
        "description": "Lock both rows in a stable order and check current state before committing the group.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "One transaction wins; the other observes the committed hold or retries after an abort.",
          "impact": "Short lock queues cost latency; admission must bound contention."
        },
        "seniorRationale": "The same database that stores ownership arbitrates it. Conditional updates with whole-group rollback are also valid; this option chooses locks for the explicit baseline.",
        "tradeOffSummary": "Short lock queues cost latency; admission must bound contention."
      },
      {
        "id": "lease",
        "title": "Use only a distributed lease",
        "description": "Acquire a timed external lock, then write the rows without checking ownership.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "A paused writer can resume after its lease expires and overwrite a newer owner.",
          "impact": "A lease reduces contention but cannot alone enforce durable exclusivity."
        },
        "seniorRationale": "Fencing or conditional writes at storage are still necessary. A lock-service success is not a durable seat grant.",
        "tradeOffSummary": "A lease reduces contention but cannot alone enforce durable exclusivity."
      },
      {
        "id": "queue",
        "title": "Acknowledge a queued request as a hold",
        "description": "Enqueue requests for a single consumer and immediately show a reserved seat.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Serialization can order future work, but accepted queue entries may target already sold seats.",
          "impact": "An honest pending response is possible; immediate reserved status breaks the contract."
        },
        "seniorRationale": "A queue is a valid admission/serialization tool only when the hold is acknowledged after authoritative execution.",
        "tradeOffSummary": "An honest pending response is possible; immediate reserved status breaks the contract."
      }
    ]
  },
  "late-payment": {
    "id": "late-payment",
    "title": "A charge arrives after closure",
    "category": "Correctness under failure",
    "scenario": "The payment window elapsed, booking A was CLOSED, and its seats were released. A late verified success arrives after buyer B has obtained them.",
    "interviewContext": "Senior and staff interviews test the authority, crash window, recovery mechanism, and customer cost behind your choice.",
    "options": [
      {
        "id": "refund",
        "title": "Preserve closure and schedule a refund",
        "description": "Write a stable refund obligation for A; leave B’s ownership intact.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "A never becomes CONFIRMED and the refund is retried until resolved.",
          "impact": "A may see a temporary charge without a ticket and needs clear status and support."
        },
        "seniorRationale": "Closure is terminal for seat acquisition. Compensation repairs money; it cannot reverse B’s legitimate ownership.",
        "tradeOffSummary": "A may see a temporary charge without a ticket and needs clear status and support."
      },
      {
        "id": "confirm",
        "title": "Trust payment success and confirm A",
        "description": "Make success the highest-priority state regardless of closure.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Two bookings can now claim the same seat.",
          "impact": "This violates the core inventory invariant."
        },
        "seniorRationale": "Financial truth is evidence of a charge, not permission to reacquire a released seat.",
        "tradeOffSummary": "This violates the core inventory invariant."
      },
      {
        "id": "ignore",
        "title": "Ignore all callbacks for closed bookings",
        "description": "Discard the event because inventory work is finished.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Seat safety survives but a customer can remain charged without a ticket.",
          "impact": "Financial obligations become invisible."
        },
        "seniorRationale": "Terminal inventory state does not mean terminal financial state; durable reconciliation must continue.",
        "tradeOffSummary": "Financial obligations become invisible."
      }
    ]
  },
  "overload": {
    "id": "overload",
    "title": "Where should the queue live?",
    "category": "Correctness under failure",
    "scenario": "The illustrative burst is 8,333 arrivals/s while the safe tested attempt budget is 360/s. Pending payments are growing.",
    "interviewContext": "Senior and staff interviews test the authority, crash window, recovery mechanism, and customer cost behind your choice.",
    "options": [
      {
        "id": "gate",
        "title": "Bound admission and reserve recovery capacity",
        "description": "Lower new-hold permits as payment backlog grows and preserve status/callback budgets.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Useful work stays bounded and previously accepted obligations can drain.",
          "impact": "More users wait; fairness and sellout communication become product responsibilities."
        },
        "seniorRationale": "Capacity is multi-dimensional. Healthy hold latency cannot justify unlimited pending payment work.",
        "tradeOffSummary": "More users wait; fairness and sellout communication become product responsibilities."
      },
      {
        "id": "threads",
        "title": "Scale application threads without a gate",
        "description": "Let the database lock queue absorb excess demand.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "The hot event remains serialized and timeouts trigger retries.",
          "impact": "More memory and connections can reduce useful throughput."
        },
        "seniorRationale": "Horizontal compute is useful for independent work, but cannot expand inventory or provider capacity.",
        "tradeOffSummary": "More memory and connections can reduce useful throughput."
      },
      {
        "id": "retry",
        "title": "Retry every timeout immediately",
        "description": "Keep retrying until each caller receives a definitive response.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Unknown outcomes create a retry storm even with deduplication.",
          "impact": "Idempotency prevents duplicate effects but still consumes resources."
        },
        "seniorRationale": "Bound retries with jitter, status recovery, and an overall deadline; deduplication is not overload control.",
        "tradeOffSummary": "Idempotency prevents duplicate effects but still consumes resources."
      }
    ]
  },
  "regional-safety": {
    "id": "regional-safety",
    "title": "Promote a lagging replica?",
    "category": "Correctness under failure",
    "scenario": "A remote asynchronous replica does not contain every acknowledged booking. The old region is unreachable and cannot yet be proven fenced.",
    "interviewContext": "Senior and staff interviews test the authority, crash window, recovery mechanism, and customer cost behind your choice.",
    "options": [
      {
        "id": "freeze",
        "title": "Pause sales and establish authority",
        "description": "Fence the old writer and recover or quarantine uncertain inventory before reopening.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "No new sales use a history known to be incomplete.",
          "impact": "Availability and revenue are sacrificed while recovery proceeds."
        },
        "seniorRationale": "The safety requirement forbids treating missing records as available inventory. A recovered payment ledger alone cannot reconstruct every hold.",
        "tradeOffSummary": "Availability and revenue are sacrificed while recovery proceeds."
      },
      {
        "id": "promote",
        "title": "Promote immediately for availability",
        "description": "Use the remote snapshot as the complete inventory state.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Previously acknowledged inventory may be sold again.",
          "impact": "Lower downtime comes with a correctness violation."
        },
        "seniorRationale": "Asynchronous replication cannot promise zero acknowledged-write loss under this failure.",
        "tradeOffSummary": "Lower downtime comes with a correctness violation."
      },
      {
        "id": "dual",
        "title": "Allow both regions to sell and merge",
        "description": "Resolve conflicts when the network heals.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Qualitative expected behavior; not a benchmark",
          "outcome": "Two customers can receive conflicting confirmed entitlements.",
          "impact": "Refunding a loser is a product change, not preservation of the original guarantee."
        },
        "seniorRationale": "Active-active ownership needs disjoint inventory or coordinated writes; last-write-wins does not make overselling disappear.",
        "tradeOffSummary": "Refunding a loser is a product change, not preservation of the original guarantee."
      }
    ]
  }
};
