import type { DiagramDefinition } from '@/types/diagram';
import {
  createNode,
  createEdge,
  createFlowEvent,
  createFlowSequence,
  createDiagramState,
} from '@/utils/diagram-builder';

// 1. Nodes
const CLIENT_NODE = createNode({
  id: 'client',
  label: 'API Consumer',
  role: 'client',
  x: 70,
  y: 220,
  spec: {
    responsibilities: ['Initiates HTTP API calls', 'Handles HTTP 429 Retry-After response headers', 'Implements exponential backoff with jitter'],
    inputsAndProtocols: ['HTTPS 1.1 / HTTP/2'],
    outputsAndCodes: ['REST JSON payload', 'Authorization: Bearer <token>'],
    stateAndPersistence: 'Stateless',
    failureModes: ['Aggressive retry storms during partial outages (mitigated by jitter)'],
    tradeoffs: ['SDK client-side throttling vs pure server-side enforcement'],
  },
});

const GATEWAY_NODE = createNode({
  id: 'gateway',
  label: 'API Gateway / Limiter',
  role: 'service',
  x: 320,
  y: 220,
  conceptId: 'load-balancer',
  spec: {
    responsibilities: ['TLS termination', 'Extracts API key and token quota', 'Executes rate limiting policy'],
    inputsAndProtocols: ['HTTPS Port 443'],
    outputsAndCodes: ['HTTP 200 OK (passed)', 'HTTP 429 Too Many Requests (throttled)'],
    stateAndPersistence: 'Stateless; state offloaded to Redis Cluster',
    failureModes: ['Redis timeout (mitigated by fail-open policy with circuit breaker)'],
    tradeoffs: ['Fail-open (preserves availability) vs Fail-closed (protects downstream DB)'],
  },
});

const REDIS_NODE = createNode({
  id: 'redis',
  label: 'Redis Cluster',
  role: 'cache',
  x: 540,
  y: 120,
  conceptId: 'cache',
  spec: {
    responsibilities: ['Stores sliding window counter logs', 'Executes atomic Lua rate check script', 'Auto-expires keys with TTL'],
    inputsAndProtocols: ['RESP protocol over TCP port 6379'],
    outputsAndCodes: ['Integer response: 1 (allowed) or 0 (throttled)'],
    stateAndPersistence: 'In-memory with AOF persistence enabled',
    failureModes: ['Master failover latency (mitigated by Redis Sentinel / Cluster auto-failover in < 3s)'],
    tradeoffs: ['Sliding Window Log (exact, higher RAM) vs Token Bucket (approximate, minimal RAM)'],
  },
});

const BACKEND_NODE = createNode({
  id: 'backend',
  label: 'Core Services',
  role: 'service',
  x: 540,
  y: 320,
  spec: {
    responsibilities: ['Executes business logic and database writes'],
    inputsAndProtocols: ['Internal gRPC / HTTP'],
    outputsAndCodes: ['HTTP 200 JSON payload'],
    stateAndPersistence: 'Stateless',
    failureModes: ['Resource saturation if rate limiter fails closed/open incorrectly'],
    tradeoffs: ['Direct DB queries vs cached query results'],
  },
});

// 2. Edges (Explicit IDs recommended: 'source-to-target')
// Edges are directed: an event animates the packet in the edge's from→to direction.
// Model responses as their own dashed edge pointing back (gw→client), never by
// reusing the request edge — that would animate the response backwards.
const edgeClientToGw = createEdge('client', 'gateway', 'HTTPS', { id: 'client-to-gw' });
const edgeGwToRedis = createEdge('gateway', 'redis', 'EVALSHA Lua', { id: 'gw-to-redis' });
const edgeGwToBackend = createEdge('gateway', 'backend', 'gRPC', { id: 'gw-to-backend' });
const edgeGwToClient = createEdge('gateway', 'client', 'HTTP 429', { id: 'gw-to-client', style: 'dashed' });

// 3. Flow Sequences
const allowedFlow = createFlowSequence('allowed-flow', '1. Allowed Request (Within Quota)', [
  createFlowEvent({
    label: '1. API Request',
    description: 'Client submits API request with API key header.',
    edgeIds: ['client-to-gw'],
    highlightNodeIds: ['client', 'gateway'],
  }),
  createFlowEvent({
    label: '2. Atomic Token Check',
    description: 'Gateway executes Redis Lua script to decrement token bucket.',
    edgeIds: ['gw-to-redis'],
    highlightNodeIds: ['gateway', 'redis'],
  }),
  createFlowEvent({
    label: '3. Forward to Service',
    description: 'Token available; Gateway forwards request to backend service.',
    edgeIds: ['gw-to-backend'],
    highlightNodeIds: ['gateway', 'backend'],
  }),
]);

const throttledFlow = createFlowSequence('throttled-flow', '2. Throttled Request (Quota Exceeded)', [
  createFlowEvent({
    label: '1. Excessive Request',
    description: 'Client exceeds 100 req/min rate limit threshold.',
    edgeIds: ['client-to-gw'],
    highlightNodeIds: ['client', 'gateway'],
  }),
  createFlowEvent({
    label: '2. Redis Quota Rejection',
    description: 'Redis Lua script rejects the request; the gateway derives Retry-After from the refill policy.',
    edgeIds: ['gw-to-redis'],
    highlightNodeIds: ['gateway', 'redis'],
  }),
  createFlowEvent({
    label: '3. Return HTTP 429',
    description: 'Gateway immediately rejects request with 429 Too Many Requests and Retry-After header.',
    edgeIds: ['gw-to-client'],
    highlightNodeIds: ['gateway', 'client'],
  }),
]);

// 4. Export DiagramDefinition
export const rateLimiterDiagrams: DiagramDefinition = {
  states: {
    'baseline': createDiagramState('baseline', [CLIENT_NODE, GATEWAY_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToBackend]),
    'scaled': createDiagramState('scaled', [CLIENT_NODE, GATEWAY_NODE, REDIS_NODE, BACKEND_NODE], [edgeClientToGw, edgeGwToRedis, edgeGwToBackend, edgeGwToClient], [allowedFlow, throttledFlow]),
  },
};
