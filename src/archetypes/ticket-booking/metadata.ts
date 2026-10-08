import type { ArchetypeMetadata } from '@/types/archetype';

export const ticketBookingMetadata: ArchetypeMetadata = {
  "id": "ticket-booking",
  "title": "Ticket Booking",
  "description": "Design a flash-sale ticket system: atomic seat holds, payment uncertainty, fair admission, hot-event scaling, and safe recovery.",
  "stage": "foundation",
  "sequence": 8,
  "availability": "available",
  "estimatedMinutes": 110,
  "tags": [
    "reservations",
    "concurrency",
    "idempotency",
    "payments",
    "admission-control",
    "reconciliation"
  ]
};
