import type { DiagramDefinition, DiagramNode } from '@/types/diagram';
import { createNode, createEdge, createFlowEvent, createFlowSequence, createDiagramState } from '@/utils/diagram-builder';

function node(id: string, label: string, role: DiagramNode['role'], x: number, y: number, responsibility: string, state: string, failure: string, cost: string, conceptId?: string) {
  return createNode({ id, label, role, x, y, conceptId, description: responsibility, spec: {
    responsibilities: [responsibility], inputsAndProtocols: [role === 'database' ? 'Authenticated SQL / replication protocol' : 'Authenticated HTTPS or internal worker protocol'],
    outputsAndCodes: [id === 'booking' ? '201 committed hold; 202 payment pending; 409 conflict; authenticated status' : 'Committed state or explicit failure; timeouts are unknown outcomes'],
    stateAndPersistence: state, failureModes: [failure], tradeoffs: [cost],
  } });
}
const buyer = node('buyer', 'Buyer', 'client', 60, 170, 'Persist retry identity and display server booking status.', 'Local operation IDs; never inventory authority.', 'Lost response: query status or retry the same operation.', 'Countdown and maps are hints.');
const booking = node('booking', 'Booking API', 'service', 310, 170, 'Authorize requests and execute guarded booking transitions; represents a service fleet.', 'Stateless compute; durable workflow in inventory database.', 'Crash after commit: recover via request ledger.', 'One event remains one transactional boundary.', 'idempotency');
const inventory = node('inventory', 'Inventory DB', 'database', 560, 170, 'Arbitrate seats, holds, bookings, inbox and outbox in one event shard.', 'Durable transactional records; configured synchronous AZ copies are collapsed.', 'Stale writer or lagging promotion: fence or stop mutations.', 'Locks, durability and local transactions impose latency and a hot-event ceiling.', 'database-index');
const worker = node('worker', 'Recovery worker', 'service', 560, 370, 'Claim bounded due-work batches with backoff; sweep expiry, reconcile payments, close overdue bookings, issue tickets and retry refunds.', 'Operations and deadlines persist in the database; worker fleet is replaceable.', 'Crash after remote effect: reuse identity and reconcile.', 'At-least-once work requires effect deduplication.', 'transactional-outbox');
const provider = node('provider', 'Payment provider', 'external', 310, 370, 'Execute financial operations and expose signed events and status queries.', 'Independent financial ledger outside the booking transaction.', 'Timeout, delayed success or duplicate event: persist unknown and reconcile.', 'No atomic commit with seat inventory.');
const gate = node('gate', 'Admission / edge', 'loadbalancer', 60, -30, 'Redundant ingress validates admission permits and routes mutations to the event owner.', 'Replicated bounded queue and atomic permit claims; cached directory epochs validated by fenced storage.', 'Admission failure: pause new holds; reserve recovery capacity.', 'Waiting and fairness policy replace unbounded downstream contention.', 'load-balancer');
const maps = node('maps', 'Public maps', 'cache', 310, -30, 'CDN and origin snapshot tiers for public approximate seat availability.', 'Commit-watermarked two-bit snapshots with source timestamps; ordered resumable projector collapsed into projection edge.', 'Cold cache or projector lag: coalesce rebuilds, reject stale versions, expose stale source timestamps.', 'Freshness and origin analytics visibility are sacrificed for read scale.', 'cache');
const replica = node('replica', 'Remote standby', 'database', 810, 170, 'Retain asynchronous recovery copies; never authorize sales while ownership is uncertain.', 'Potentially lagging regional history.', 'Region loss: freeze sales until fencing and authoritative history are established.', 'Lower replication latency accepts a nonzero data-loss risk.');
const edge = (id: string, from: string, to: string, label: string, dashed = false) => createEdge(from, to, label, { id, style: dashed ? 'dashed' : 'solid', labelPosition: ['arrive', 'return-buyer', 'poll', 'intent'].includes(id) ? 0.2 : 0.5 });
const event = (label: string, description: string, edgeIds: string[], highlightNodeIds: string[]) => createFlowEvent({label, description, edgeIds, highlightNodeIds});
const baselineEdges = [edge('request','buyer','booking','Hold request'), edge('commit','booking','inventory','Transaction'), edge('committed','inventory','booking','Commit result',true), edge('response','booking','buyer','Hold result',true)];
const hold = createFlowSequence('hold','Hold a pair',[
 event('Request','Buyer sends a durable purchase intent, stable retry key, and exact seat list.',['request'],['buyer','booking']),
 event('Arbitrate','Lock rows, check availability, and atomically persist all seats plus response.',['commit'],['inventory']),
 event('Durable result','Only a committed result grants the hold.',['committed'],['booking','inventory']),
 event('Acknowledge','Lost responses are recovered with the same key.',['response'],['buyer']),
]);
const paymentEdges = [edge('poll','worker','inventory','Apply / poll'), edge('intent','inventory','worker','Work',true), edge('charge','worker','provider','Pay / query'), edge('outcome','provider','worker','Outcome',true), edge('callback','provider','booking','Signed event')];
const checkout = createFlowSequence('checkout','Payment & recovery',[
 event('Persist intent','Checkout returns an existing booking or retains seats and commits one PAYMENT_PENDING booking, absolute deadline, and outbox.',['commit'],['booking','inventory']),
 event('Recoverable work','A worker reads the durable operation; a crash does not erase intent.',['intent'],['worker']),
 event('Remote effect','Use the same provider operation identity for safe retries.',['charge'],['provider']),
 event('Unknown or verified','A response or status query supplies evidence; a timeout stays unknown.',['outcome'],['worker']),
 event('Apply outcome','Confirm only pending bookings before deadline; overdue bookings close and verified charges create refund obligations.',['poll'],['inventory']),
]);
const scaledEdges = [edge('arrive','buyer','gate','Request'),edge('route','gate','booking','Admitted'),edge('return-gate','booking','gate','Result',true),edge('return-buyer','gate','buyer','Result',true),edge('read-map','gate','maps','Public read'),edge('map-result','maps','gate','Snapshot',true),edge('project','inventory','maps','Versioned projection',true),...baselineEdges.filter(e=>!['request','response'].includes(e.id)),...paymentEdges];
const admitted = createFlowSequence('admitted','Admit & reserve',[
 event('Queue','Check event-bound permit and attempt budget.',['arrive'],['gate']),
 event('Route','Ingress routes to the event owner; it does not sell the seat.',['route'],['booking']),
 event('Commit','Inventory checks current ownership despite stale maps.',['commit'],['inventory']),
 event('Committed result','The writer returns the authoritative result.',['committed'],['booking']),
 event('Through ingress','Response travels back through ingress.',['return-gate'],['gate']),
 event('Buyer result','Hold granted or explicit conflict; never sell from a cache.',['return-buyer'],['buyer']),
]);
const fence = createFlowSequence('fence','Regional uncertainty',[
 event('Asynchronous copy','Remote history may lag acknowledged writes.',['replicate'],['inventory','replica']),
 event('Pause admission','Stop mutations when committed history or writer authority is uncertain.',[],['gate','booking']),
 event('Establish authority','Fence the old writer and recover history; quarantine uncertain seats. No automatic promotion is depicted.',[],['inventory','replica']),
 event('Reconcile before reopening','With admission paused, reconcile authoritative history and process elapsed deadlines in bounded batches; never reset the clock.',[],['worker','provider','inventory']),
]);
export const ticketBookingDiagrams: DiagramDefinition = { states: {
 baseline: createDiagramState('baseline',[buyer,booking,inventory],baselineEdges,[hold]),
 payments: createDiagramState('payments',[buyer,booking,inventory,worker,provider],[...baselineEdges,...paymentEdges],[hold,checkout]),
 scaled: createDiagramState('scaled',[buyer,gate,maps,booking,inventory,worker,provider],scaledEdges,[admitted,checkout]),
 regional: createDiagramState('regional',[buyer,gate,maps,booking,inventory,worker,provider,replica],[...scaledEdges,edge('replicate','inventory','replica','Async copy',true)],[admitted,checkout,fence]),
} };
