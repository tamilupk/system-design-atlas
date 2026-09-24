import { ingressExamples, serviceExamples, gatewayExamples, ownerExamples, relayExamples, storeExamples, presenceExamples, replicaExamples } from './implementation-examples';
import type { DiagramDefinition, FlowSequence, DiagramNode, DiagramNodeRole } from '@/types/diagram';
import { createNode, createEdge, createFlowEvent, createFlowSequence, createDiagramState } from '@/utils/diagram-builder';

// Core server coordinates stay fixed; scaled states regroup clients around explicit ingress.
function node(id: string, label: string, role: DiagramNodeRole, x: number, y: number,
  responsibilities: string[], state: string, failures: string[], tradeoffs: string[],
  inputs: string[], outputs: string[], conceptId?: string, implementationExamples?: DiagramNode['implementationExamples']) {
  return createNode({ id, label, role, x, y, conceptId, implementationExamples, description: responsibilities[0], spec: {
    responsibilities, stateAndPersistence: state, failureModes: failures, tradeoffs,
    inputsAndProtocols: inputs, outputsAndCodes: outputs,
  } });
}
const sender = node('sender', 'Sender devices', 'client', 70, 180,
  ['Persist pending sends', 'Reuse retry identity', 'Merge committed sequence positions'],
  'Local durable pending queue and conversation cursors',
  ['Lost ACK: retry the same ID', 'Device clock skew: display server order'],
  ['Optimistic UI improves responsiveness but must show pending state'],
  ['WSS / HTTPS on 443'], ['SEND, RESUME, delivery and read receipts']);
const service = node('service', 'Chat service', 'service', 350, 180,
  ['Authenticate and authorize', 'Serialize a conversation transaction', 'Push after commit'],
  'Single process with local socket map; durable state in database',
  ['Crash after commit: reconnect must fetch history', 'Process failure: all local sockets reconnect'],
  ['Simple deployment; live delivery has a crash window'], ['WSS / HTTPS on 443'], ['ACCEPTED, FORBIDDEN, RETRY_LATER'], undefined, serviceExamples);
const store = node('store', 'Message shard', 'database', 660, 180,
  ['Store messages and dedup identity', 'Commit message events and membership changes', 'Persist outbox in durable states'],
  'Conversation-partitioned SQL; primary plus synchronous AZ standby (standby collapsed in diagram)',
  ['Replica lag: use primary or wait for required position', 'Stale primary: fence before promotion'],
  ['Atomicity simplifies correctness; one conversation serializes'], ['Internal SQL over TLS'], ['Committed sequence or transaction failure'], 'database-index', storeExamples);
const recipient = node('recipient', 'Recipient devices', 'client', 960, 390,
  ['Persist before delivery receipt', 'Track contiguous received position', 'Fetch gaps after reconnect'],
  'Local message cache and per-device cursors',
  ['Slow device: disconnect and resume', 'Duplicate events: upsert by conversation and sequence'],
  ['Delivery to one device does not prove a human read'], ['WSS events / HTTPS history'], ['DELIVERED, READ']);
const gateway = node('gateway', 'Socket gateways', 'service', 350, 180,
  ['Maintain authenticated sockets', 'Bound per-socket queues', 'Route sends to conversation owner'],
  'Ephemeral socket state; no authoritative message storage',
  ['Deployment herd: drain with jitter', 'Slow consumers: bounded buffers and resync'],
  ['Scale connection memory separately from durable writes'], ['WSS on 443; internal mTLS'], ['ACCEPTED, RESYNC_REQUIRED, RETRY_LATER'], undefined, gatewayExamples);
const ingress = node('ingress', 'Load balancer', 'loadbalancer', 350, -40,
  ['Distribute new WebSocket connections to healthy gateways', 'Proxy established bidirectional sessions', 'Terminate edge TLS and re-encrypt to gateways'],
  'Redundant regional ingress fleet; connection bindings only, no durable chat state',
  ['Proxy or gateway failure: sockets reconnect with jitter and resume cursors', 'Idle timeout or draining: bound reconnect bursts and reject overload'],
  ['One extra network hop; existing sockets cannot migrate transparently'],
  ['WSS / HTTPS on 443'], ['WebSocket upgrade or handshake rejection; proxied frames'], 'load-balancer', ingressExamples);
const owner = node('owner', 'Conversation owner', 'service', 660, -40,
  ['Check current membership', 'Assign sequence in transaction', 'Enforce current ownership epoch'],
  'Shard routing plus database-enforced ownership epoch',
  ['Paused old owner: reject stale epoch', 'Hot room: rate-limit its serial write path'],
  ['One order per room sacrifices minority-side write availability'], ['Internal mTLS RPC'], ['Committed identity or retryable failure'], 'message-ordering', ownerExamples);
const presence = node('presence', 'Presence / routes', 'cache', 70, 390,
  ['Map device to gateway', 'Expire heartbeat leases', 'Compare session generation on removal'],
  'TTL hints; rebuilt on reconnect',
  ['Late disconnect: conditional delete only', 'Cache outage: presence becomes unknown'],
  ['Approximate liveness is cheaper than durable presence'], ['Internal cache protocol over TLS'], ['Gateway hint or unknown'], 'cache', presenceExamples);
const fanout = node('fanout', 'Relay / fan-out', 'queue', 660, 390,
  ['Read committed outbox', 'Retry delivery to online routes', 'Update discovery projections and schedule push hints'],
  'Outbox on message shard; durable relay checkpoints; bounded work queues',
  ['Crash after publish: repeat safely', 'Backlog: isolate tenants and apply admission control'],
  ['At-least-once work adds duplicates and lag, preserves recovery'], ['SQL / change stream; internal mTLS'], ['MESSAGE events or push hint'], 'transactional-outbox', relayExamples);
const replica = node('replica', 'Remote replica', 'database', 960, -40,
  ['Receive asynchronous log', 'Expose durable replication position', 'Remain read-only until safe promotion'],
  'Remote disaster-recovery copy; not on ordinary ACK path',
  ['Lag: do not claim zero regional RPO', 'Unsafe promotion: freeze writes until fenced'],
  ['Lower send latency versus possible regional data loss'], ['Replication over mTLS'], ['Replication position / lag'], undefined, replicaExamples);
const edge = (from: string, to: string, label: string, response = false) => createEdge(from, to, label, {
  id: `${from}-to-${to}`, style: response ? 'dashed' : 'solid', labelPosition: 0.35,
});
const event = (label: string, description: string, edgeIds: string[], highlightNodeIds: string[]) => createFlowEvent({ label, description, edgeIds, highlightNodeIds });
const baseEdges = [edge('sender','service','SEND'), edge('service','store','Transaction'), edge('store','service','Commit',true), edge('service','sender','ACCEPTED',true), edge('service','recipient','Live message')];
const commit = createFlowSequence('commit','Commit then send',[
  event('1. Pending send','Client persists its retry identity before transmission.',['sender-to-service'],['sender','service']),
  event('2. Commit','Authorization, sequence allocation, and message insert share one transaction.',['service-to-store'],['store']),
  event('3. Durable result','Database confirms commit under the configured AZ durability policy.',['store-to-service'],['service','store']),
  event('4. Acknowledge','ACCEPTED means persisted, not delivered to a recipient.',['service-to-sender'],['sender']),
  event('5. Best-effort delivery','A crash here motivates adding a durable outbox.',['service-to-recipient'],['recipient']),
]);
const durableEdges = [edge('sender','gateway','SEND / RESUME'),edge('gateway','sender','ACK / history',true),edge('gateway','owner','Route'),edge('owner','gateway','Accepted / history',true),edge('owner','store','Fenced write'),edge('store','owner','Commit / rows',true),edge('store','fanout','Outbox'),edge('fanout','gateway','Delivery'),edge('gateway','recipient','MESSAGE'),edge('gateway','presence','Lease / lookup')];
const accepted = createFlowSequence('accepted','Durable send',[
 event('1. Send','The gateway authenticates the session and routes a stable client message ID.',['sender-to-gateway','gateway-to-owner'],['sender','gateway','owner']),
 event('2. Atomic persistence','The owner commits the message, create event, sequence, dedup identity, and outbox together.',['owner-to-store'],['owner','store']),
 event('3. Commit result','Only a successful durable commit permits an acceptance response.',['store-to-owner'],['store','owner']),
 event('4. ACK','Lost acceptance responses are safe to retry with the original identity.',['owner-to-gateway','gateway-to-sender'],['sender','gateway']),
 event('5. Relay','The relay reads committed outbox work and routes delivery; retries may duplicate it.',['store-to-fanout','fanout-to-gateway'],['fanout','gateway']),
 event('6. Deliver','Recipient persists and deduplicates the event; receipt traffic is omitted for clarity.',['gateway-to-recipient'],['recipient']),
]);
const reconnect = createFlowSequence('reconnect','Gap recovery',[
 event('1. Resume','A device reconnects with its last contiguous persisted cursor.',['sender-to-gateway'],['sender','gateway']),
 event('2. Register live route','Install a new session generation and buffer bounded live arrivals.',['gateway-to-presence'],['presence','gateway']),
 event('3. Fetch boundary','Owner reads an authorized history page through a captured high-water mark.',['gateway-to-owner','owner-to-store'],['owner','store']),
 event('4. Return history','Read the primary, or wait until a replica has applied the required position.',['store-to-owner','owner-to-gateway'],['store','gateway']),
 event('5. Merge','Merge history and buffered live events by sequence; detect gaps and repeat until caught up.',['gateway-to-sender'],['sender']),
]);
const durableNodes = [sender,gateway,owner,store,presence,fanout,recipient];
// Expand the logical client paths only once ingress becomes a teaching objective.
const ingressPaths: Record<string, string[]> = {
  'sender-to-gateway': ['sender-to-ingress', 'ingress-to-gateway'],
  'gateway-to-sender': ['gateway-to-ingress', 'ingress-to-sender'],
  'gateway-to-recipient': ['gateway-to-ingress', 'ingress-to-recipient'],
};
const scaledEdges = [
  ...durableEdges.filter(item => !ingressPaths[item.id]),
  edge('sender', 'ingress', 'SEND / RESUME'),
  edge('ingress', 'sender', 'ACK / history', true),
  edge('ingress', 'gateway', 'Bound socket'),
  edge('gateway', 'ingress', 'Socket frames', true),
  edge('ingress', 'recipient', 'MESSAGE', true),
];
const scaledNodes = [
  { ...sender, y: -40 }, ingress, gateway, owner, store, presence, fanout,
  { ...recipient, x: 70, y: 180 },
];
function throughIngress(flow: FlowSequence): FlowSequence {
  return { ...flow, events: flow.events.map(item => ({
    ...item,
    edgeIds: item.edgeIds.flatMap(id => ingressPaths[id] ?? [id]),
    highlightNodeIds: item.edgeIds.some(id => ingressPaths[id])
      ? [...new Set([...item.highlightNodeIds, 'ingress'])] : item.highlightNodeIds,
    description: item === flow.events[0]
      ? (flow.id === 'reconnect'
        ? 'A new connection is balanced to a healthy gateway; the device resumes with its persisted cursor. Old sockets cannot be migrated.'
        : 'Ingress proxies the established socket to its bound gateway; the gateway authenticates and routes the send to its conversation owner.')
      : item.description,
  })) };
}
const scaledFlows = [throughIngress(accepted), throughIngress(reconnect)];
const failover = createFlowSequence('failover','Partition & promotion',[
 event('1. Replication lag','Remote replication is asynchronous; its durable position may trail acknowledged writes.',['store-to-replica'],['store','replica']),
 event('2. Freeze affected writes','When authority is uncertain, sends remain pending instead of claiming acceptance.',[],['owner','gateway']),
 event('3. Fence old authority','An external quorum/control plane must revoke old write authority and install a new epoch before promotion; omitted from this data-path diagram.',[],['owner','store','replica']),
 event('4. Verify recovery point','Check remote durability against the last known commit position. Missing data requires recovery or an explicit data-loss decision.',[],['replica']),
 event('5. Resume after safe remap','After fencing and data reconciliation, routing points to the promoted store. Clients retry original IDs; no automatic promotion is implied.',[],['owner','replica','sender']),
]);
export const chatDiagrams: DiagramDefinition = { states: {
 baseline: createDiagramState('baseline',[sender,service,store,recipient],baseEdges,[commit]),
 durable: createDiagramState('durable',durableNodes,durableEdges,[accepted,reconnect]),
 scaled: createDiagramState('scaled',scaledNodes,scaledEdges,scaledFlows),
 regional: createDiagramState('regional',[...scaledNodes,replica],[...scaledEdges,edge('store','replica','Async log')],[...scaledFlows,failover]),
} };
