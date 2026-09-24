import type { DiagramNode } from '@/types/diagram';

type Examples = NonNullable<DiagramNode['implementationExamples']>;

// These are implementations of this chapter's contracts, not role-based substitutions.
function customCompute(note: string, tech: NonNullable<Examples['tech']>): Examples {
  return {
    tech,
    aws: {
      shortLabel: 'EC2 · custom app',
      name: 'Amazon EC2 running custom chat code',
      note,
      docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html',
    },
    gcp: {
      shortLabel: 'Compute Engine',
      name: 'Compute Engine running custom chat code',
      note,
      docsUrl: 'https://docs.cloud.google.com/compute/docs/overview',
    },
  };
}

export const serviceExamples = customCompute(
  'Hosts the baseline chat process and its sockets. Authentication, membership checks, transactions, and delivery remain application code.',
  {
    "shortLabel": "Go \u00b7 WebSocket",
    "name": "Go with coder/websocket",
    "note": "Go hosts custom chat logic; coder/websocket supplies WebSocket transport. Membership checks and commit-before-ACK semantics remain application code. Bound connection buffers and implement shutdown.",
    "docsUrl": "https://github.com/coder/websocket"
},
);
export const gatewayExamples = customCompute(
  'Hosts custom WebSocket gateways. Size connection memory, bound send buffers, and drain sockets during deployments; a VM does not supply reconnect or delivery semantics.',
  {
    "shortLabel": "Go \u00b7 WebSocket",
    "name": "Go with coder/websocket",
    "note": "A Go gateway can own long-lived sockets with a maintained WebSocket library. Set message limits, origin policy, heartbeat deadlines, and bounded send queues. Benchmark memory per connection; the library does not implement resume or durable delivery.",
    "docsUrl": "https://github.com/coder/websocket"
},
);
export const ownerExamples = customCompute(
  'Hosts the conversation owner. The application implements shard routing, per-conversation sequencing, and database-enforced ownership epochs; compute failover alone cannot fence a stale owner.',
  {
    "shortLabel": "Go service",
    "name": "Custom Go conversation-owner service",
    "note": "Go is a practical service runtime, not an ordering engine. Implement membership checks, transactional sequence allocation, and epoch fencing in PostgreSQL. Keep each conversation serial even when requests execute concurrently.",
    "docsUrl": "https://go.dev/doc/database/execute-transactions"
},
);
export const relayExamples = customCompute(
  'Hosts custom outbox polling and fan-out workers. The outbox stays in the message database; persist checkpoints, retry safely, and bound work queues. A managed queue alone would not implement this combined node.',
  {
    "shortLabel": "Go outbox worker",
    "name": "Custom Go outbox and fan-out worker",
    "note": "Poll committed PostgreSQL outbox rows with bounded batches and worker coordination. Persist checkpoints, retry idempotently, and bound fan-out. This implementation needs no Kafka broker; adding one is a separate delivery-boundary decision.",
    "docsUrl": "https://go.dev/doc/database/execute-transactions"
},
);

export const storeExamples: Examples = {
  tech: {
    "shortLabel": "PostgreSQL",
    "name": "PostgreSQL with synchronous AZ standby",
    "note": "SQL transactions keep message identity, sequence, and membership checks atomic; durable states also commit the outbox. Require synchronous standby WAL flush for the promised AZ durability. Configure leader election, fencing, and shard routing separately.",
    "docsUrl": "https://www.postgresql.org/docs/current/warm-standby.html"
},
  aws: {
    shortLabel: 'RDS PostgreSQL',
    name: 'RDS for PostgreSQL with Multi-AZ',
    note: 'One message shard with a synchronous AZ standby. Commit messages, dedup identity, and sequence together; durable states add the outbox to that transaction. Shard routing and ownership fencing remain application responsibilities.',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html',
  },
  gcp: {
    shortLabel: 'Cloud SQL · PG',
    name: 'Cloud SQL for PostgreSQL with regional HA',
    note: 'One message shard with synchronous durability across zones. Configure HA explicitly. Durable states add an outbox in the message transaction; the baseline has no outbox. The application still owns sharding and ownership epochs.',
    docsUrl: 'https://docs.cloud.google.com/sql/docs/postgres/high-availability',
  },
};

export const presenceExamples: Examples = {
  tech: {
    "shortLabel": "Redis",
    "name": "Redis presence and routing hints",
    "note": "Expiring keys fit heartbeat leases. Use atomic generation checks when removing routes; rebuild hints after loss. Redis presence is neither durable delivery proof nor authoritative shard ownership.",
    "docsUrl": "https://redis.io/docs/latest/develop/using-commands/keyspace/"
},
  aws: {
    shortLabel: 'ElastiCache',
    name: 'Amazon ElastiCache for Redis OSS',
    note: 'Stores expiring device-to-gateway hints. Heartbeats and generation-checked removal remain application logic. Cache loss means unknown presence, never lost authoritative messages.',
    docsUrl: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Endpoints.html',
  },
  gcp: {
    shortLabel: 'Memorystore',
    name: 'Memorystore for Redis',
    note: 'Stores TTL-based presence and routing hints. Rebuild on reconnect; do not use these hints as a durable delivery receipt or ownership authority.',
    docsUrl: 'https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview',
  },
};

export const replicaExamples: Examples = {
  tech: {
    "shortLabel": "PostgreSQL replica",
    "name": "PostgreSQL asynchronous remote standby",
    "note": "Stream WAL asynchronously to a remote region. This preserves the lesson's latency trade-off but permits regional data loss. Check replay position, fence the old writer, and reconcile history before promotion; no zero-RPO guarantee.",
    "docsUrl": "https://www.postgresql.org/docs/current/warm-standby.html"
},
  aws: {
    shortLabel: 'RDS read replica',
    name: 'RDS for PostgreSQL cross-Region read replica',
    note: 'An asynchronous disaster-recovery copy, separate from the synchronous AZ standby. Lag permits regional data loss; fence the old writer, verify the recovery position, and remap routing before resuming writes.',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html',
  },
  gcp: {
    shortLabel: 'Cloud SQL replica',
    name: 'Cloud SQL for PostgreSQL cross-region read replica',
    note: 'An asynchronous remote copy, not the regional HA standby. Promotion does not establish the application ownership epoch; reconcile lag and fence old write authority before resuming sends.',
    docsUrl: 'https://docs.cloud.google.com/sql/docs/postgres/replication/cross-region-replicas',
  },
};

export const ingressExamples: Examples = {
  tech: {
    shortLabel: 'Envoy',
    name: 'Envoy WebSocket ingress',
    note: 'Deploy redundant proxies, enable WebSocket upgrades, and configure upstream TLS, health checks, and connection draining. Established sockets stay bound to a gateway; balancing does not implement conversation ownership.',
    docsUrl: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html',
  },
  aws: {
    shortLabel: 'ALB',
    name: 'Application Load Balancer',
    note: 'Supports persistent WebSocket connections through the proxy. Configure HTTPS listeners, gateway targets, idle timeouts, and deregistration delay. Capacity and reconnect storms require testing; no per-message rebalance is implied.',
    docsUrl: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html',
  },
  gcp: {
    shortLabel: 'Application LB',
    name: 'External Application Load Balancer',
    note: 'Proxies WebSockets to gateway backends. Choose the regional/global mode, check its connection timeout behavior, and configure draining and backend TLS. Global ingress does not make conversation writes active-active.',
    docsUrl: 'https://docs.cloud.google.com/load-balancing/docs/https',
  },
};
