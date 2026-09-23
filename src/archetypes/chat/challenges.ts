import type { ChallengeMap } from '@/types/challenge';

export const chatChallenges: ChallengeMap = {
  "lost-ack": {
    "id": "lost-ack",
    "title": "The message committed. The ACK vanished.",
    "category": "Correctness under retries",
    "scenario": "A sender retries after a timeout. The first transaction committed sequence 105, but its ACK never arrived. Two gateways now receive the same retry concurrently. Preserve one message and return its original identity.",
    "interviewContext": "Separate transport retry, durable uniqueness, and downstream delivery. Predict both the database result and the recipient experience.",
    "options": [
      {
        "id": "new-id",
        "title": "Generate a fresh ID on retry",
        "description": "Treat every network attempt as a new message.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 1 original + 2 retries = 3 message rows",
          "outcome": "All attempts can commit distinct messages.",
          "impact": "The user sees duplicates even though every database key is unique."
        },
        "seniorRationale": "An attempt identifier is not an operation identifier. The client must preserve identity across attempts.",
        "tradeOffSummary": "Pros: simple inserts. Cons: violates the stated one-message contract."
      },
      {
        "id": "atomic-dedup",
        "title": "Atomic durable deduplication",
        "description": "Reuse the client ID; serialize, compare payload, and return the existing committed sequence.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 1 original + 2 retries = 1 message row",
          "outcome": "Both retries return sequence 105; delivery events may still repeat.",
          "impact": "Recipients upsert by conversation and sequence."
        },
        "seniorRationale": "Scope identity to the authenticated sender and conversation. Store the result in the same atomic boundary as the message; reject payload mismatch.",
        "tradeOffSummary": "Pros: crash-safe uniqueness. Cons: durable identity storage and contention."
      },
      {
        "id": "cache-only",
        "title": "Deduplicate in a TTL cache",
        "description": "SET NX before writing the database.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 Crash between cache SET and DB insert = 0 messages",
          "outcome": "A retry can be suppressed even though nothing was persisted; eviction can also permit duplicates.",
          "impact": "A cache cannot prove the database effect exists."
        },
        "seniorRationale": "A TTL cache can reduce duplicate traffic but cannot be the sole correctness boundary.",
        "tradeOffSummary": "Pros: cheap fast path. Cons: two independent writes and expiration races."
      }
    ]
  },
  "partition-owner": {
    "id": "partition-owner",
    "title": "Two regions both want to own the room",
    "category": "Consistency & disaster recovery",
    "scenario": "The inter-region link fails. Region A may still serve clients; region B is 2 seconds behind. The agreed contract forbids losing accepted messages or creating two canonical sequences. Availability may degrade during uncertainty. What can B safely do?",
    "interviewContext": "State the failure model and acknowledge that a timeout is not proof the old owner is dead. Choose for these requirements, not for every chat product.",
    "options": [
      {
        "id": "promote-now",
        "title": "Promote after a timeout",
        "description": "Let B accept writes immediately; timestamps will resolve conflicts.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 At 5,000 sends/s \u00d7 2s lag, up to 10,000 accepted sends are absent",
          "outcome": "A can still write; wall clocks do not fence it or restore missing data.",
          "impact": "The design violates both durability and a single canonical order."
        },
        "seniorRationale": "A failure detector supplies suspicion, not exclusive authority. Last-write-wins cannot reconstruct missing acknowledged messages.",
        "tradeOffSummary": "Pros: quick local writes. Cons: split-brain and data loss."
      },
      {
        "id": "freeze-fence",
        "title": "Freeze, fence, and verify durability",
        "description": "Keep sends pending until exclusive authority and the committed recovery point are established.",
        "isOptimal": true,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 Uncertain authority \u2192 0 new accepted sends on B",
          "outcome": "Fencing prevents two writers, but lag must also be recovered before safe resumption.",
          "impact": "The system preserves the contract by sacrificing write availability; regional loss may prevent recovery."
        },
        "seniorRationale": "With asynchronous DR, some disasters cannot satisfy both zero data loss and prompt recovery. Keep writes frozen or negotiate a different contract; fencing alone is insufficient.",
        "tradeOffSummary": "Pros: honest safety boundary. Cons: potentially long outage."
      },
      {
        "id": "independent-regions",
        "title": "Accept independent regional histories",
        "description": "Merge regional logs when connectivity returns.",
        "isOptimal": false,
        "simulationResult": {
          "metric": "Illustrative scenario \u2014 2 authorities \u2192 2 provisional orders",
          "outcome": "A conflict-aware product could converge, but this changes the agreed canonical-order contract.",
          "impact": "Clients must understand tentative order and conflict reconciliation."
        },
        "seniorRationale": "Active-active is a valid alternative when product semantics permit it, not a transparent fix for this contract.",
        "tradeOffSummary": "Pros: partition availability. Cons: different semantics and complex reconciliation."
      }
    ]
  }
};
