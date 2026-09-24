import type { ConceptContext } from '@/types/concept';

export const chatConceptContext: ConceptContext = {
  "idempotency": {
    "conceptId": "idempotency",
    "chapterRole": "One durable message per authenticated sender, conversation, and client message ID.",
    "exampleData": "UNIQUE (conversation_id, sender_id, client_message_id)",
    "specificConsiderations": [
      "Persist the client ID before sending; reuse it on reconnect.",
      "Reject the same ID with different content.",
      "Retain deduplication identity for the supported retry window; expired requests must not silently become new sends."
    ]
  },
  "database-index": {
    "conceptId": "database-index",
    "chapterRole": "Serve ordered, bounded history pages from the conversation shard.",
    "exampleData": "PRIMARY KEY (conversation_id, seq)\nWHERE conversation_id = :c AND seq > :cursor ORDER BY seq LIMIT 100",
    "specificConsiderations": [
      "Avoid OFFSET scans of large histories.",
      "Time buckets bound storage size but do not distribute current hot writes.",
      "Deleted messages leave tombstones so synchronization can advance safely."
    ]
  },
  "cache": {
    "conceptId": "cache",
    "chapterRole": "Store short-lived socket routing and presence hints; never the only message copy.",
    "exampleData": "route:{user}:{device} = {gateway, session_generation}; TTL = 90s",
    "specificConsiderations": [
      "Refresh every 30 seconds; three missed heartbeats expire a route.",
      "Compare generation before deleting a route after disconnect.",
      "Authorize delivery against current membership; stale presence cannot grant access."
    ]
  },
  "load-balancer": {
    "conceptId": "load-balancer",
    "chapterRole": "Spread long-lived WebSocket sessions over connection gateways.",
    "exampleData": "wss://chat.example/ws (TLS 443)\nbalance new connections across healthy gateways; monitor sockets, memory, and outbound bytes",
    "specificConsiderations": [
      "A socket remains on its gateway until disconnect; new sockets may use another.",
      "Drain deployments with reconnect jitter and admission limits.",
      "Connection load and message fan-out load require different capacity signals."
    ]
  },
  "message-ordering": {
    "conceptId": "message-ordering",
    "chapterRole": "Assign a committed, monotonically increasing sequence within each conversation.",
    "exampleData": "conversation = room-42; epoch = 8; committed seq = 105",
    "specificConsiderations": [
      "Concurrent senders are ordered at commit, not by client clocks.",
      "Membership changes share the same serialization boundary.",
      "A stale owner must be fenced by storage, not merely removed from routing."
    ]
  },
  "transactional-outbox": {
    "conceptId": "transactional-outbox",
    "chapterRole": "Commit a message and its delivery obligation together on the same shard.",
    "exampleData": "transaction: message + event + conversation head + outbox(event_id = conversation:seq)",
    "specificConsiderations": [
      "A relay can publish twice after a crash; consumers deduplicate.",
      "Monitor oldest unpublished event age, not just queue length.",
      "A durable history cursor remains the recovery path when live delivery is interrupted."
    ]
  }
};
