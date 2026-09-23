import type { ArchetypeMetadata } from '@/types/archetype';

export const chatMetadata: ArchetypeMetadata = {
  "id": "chat",
  "title": "Real-Time Chat",
  "description": "Design durable messaging across devices: ordering, retry safety, reconnect recovery, fan-out, and fenced regional failover.",
  "stage": "foundation",
  "sequence": 7,
  "availability": "available",
  "estimatedMinutes": 100,
  "tags": [
    "websocket",
    "ordering",
    "idempotency",
    "outbox",
    "fan-out",
    "multi-region"
  ]
};
