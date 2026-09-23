import { messageOrderingConcept } from './message-ordering';
import { transactionalOutboxConcept } from './transactional-outbox';
import type { SharedConcept } from '@/types/concept';
import { cacheConcept } from './cache';
import { databaseIndexConcept } from './database-index';
import { loadBalancerConcept } from './load-balancer';
import { idempotencyConcept } from './idempotency';

const concepts: Record<string, SharedConcept> = {
  'message-ordering': messageOrderingConcept,
  'transactional-outbox': transactionalOutboxConcept,
  'cache': cacheConcept,
  'database-index': databaseIndexConcept,
  'load-balancer': loadBalancerConcept,
  'idempotency': idempotencyConcept,
};

export function getConcept(id: string): SharedConcept | undefined {
  return Object.hasOwn(concepts, id) ? concepts[id] : undefined;
}

export function getAllConcepts(): SharedConcept[] {
  return Object.values(concepts);
}
