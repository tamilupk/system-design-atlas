import type { DiagramNode } from '@/types/diagram';

type Examples = NonNullable<DiagramNode['implementationExamples']>;

// Deliberately authored for this chapter, never inferred from a node's role.
export const appExamples: Examples = {
  tech: {
    "shortLabel": "Go \u00b7 net/http",
    "name": "Go service using net/http",
    "note": "A small HTTP service fits create and redirect endpoints without requiring a large framework. Short-code generation, unique-conflict retries, validation, and idempotency remain application code. Team expertise may justify another runtime.",
    "docsUrl": "https://pkg.go.dev/net/http"
},
  aws: {
    shortLabel: 'EC2 · custom app',
    name: 'Amazon EC2',
    note: 'Runs your URL-shortener application. You still own short-code generation, redirects, deployment, and scaling policy.',
    docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html',
  },
  gcp: {
    shortLabel: 'Compute Engine',
    name: 'Compute Engine',
    note: 'Runs your custom URL-shortener application on VMs. Managed instance groups can host the scaled application tier.',
    docsUrl: 'https://docs.cloud.google.com/compute/docs/overview',
  },
};

export const loadBalancerExamples: Examples = {
  tech: {
    "shortLabel": "Envoy",
    "name": "Envoy HTTP proxy",
    "note": "Supports HTTP routing and upstream load balancing. Configure TLS, health checks, deadlines, and safe retry rules; deploy redundant proxies rather than making the load balancer a single point of failure.",
    "docsUrl": "https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy"
},
  aws: {
    shortLabel: 'ALB',
    name: 'Application Load Balancer',
    note: 'An HTTP/HTTPS entry point with target health checks; configure listeners, TLS, and application targets.',
    docsUrl: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html',
  },
  gcp: {
    shortLabel: 'Application LB',
    name: 'External Application Load Balancer',
    note: 'An HTTP/HTTPS entry point. Choose regional or global scope deliberately; the diagram does not imply a multi-region application.',
    docsUrl: 'https://docs.cloud.google.com/load-balancing/docs/application-load-balancer',
  },
};

export const cacheExamples: Examples = {
  tech: {
    "shortLabel": "Redis",
    "name": "Redis cache",
    "note": "TTL-based short-code lookups fit Redis. Bound memory and choose eviction deliberately; the application owns cache-aside fills and invalidation. PostgreSQL remains authoritative.",
    "docsUrl": "https://redis.io/docs/latest/develop/using-commands/keyspace/"
},
  aws: {
    shortLabel: 'ElastiCache',
    name: 'Amazon ElastiCache for Redis OSS',
    note: 'A managed cache for short-code lookups. The application still owns cache-aside behavior, TTLs, and invalidation.',
    docsUrl: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Endpoints.html',
  },
  gcp: {
    shortLabel: 'Memorystore',
    name: 'Memorystore for Redis',
    note: 'A managed Redis cache. Choose availability explicitly; caching does not replace the durable URL database.',
    docsUrl: 'https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview',
  },
};

export const primaryExamples: Examples = {
  tech: {
    "shortLabel": "PostgreSQL",
    "name": "PostgreSQL primary",
    "note": "Unique indexes enforce short-code uniqueness and transactions protect idempotent creation. Configure backups and recovery; choosing PostgreSQL alone does not establish an availability policy.",
    "docsUrl": "https://www.postgresql.org/docs/current/ddl-constraints.html"
},
  aws: {
    shortLabel: 'RDS PostgreSQL',
    name: 'Amazon RDS for PostgreSQL',
    note: 'Stores URL mappings and enforces unique short codes. Backups and Multi-AZ availability need explicit configuration.',
    docsUrl: 'https://aws.amazon.com/rds/postgresql/',
  },
  gcp: {
    shortLabel: 'Cloud SQL · PG',
    name: 'Cloud SQL for PostgreSQL',
    note: 'Stores URL mappings and enforces unique short codes. High availability and backup policy are separate choices.',
    docsUrl: 'https://docs.cloud.google.com/sql/docs/postgres/introduction',
  },
};

export const replicaExamples: Examples = {
  tech: {
    "shortLabel": "PostgreSQL replica",
    "name": "PostgreSQL streaming read replica",
    "note": "An asynchronous hot standby offloads reads but may lag. Route read-after-create to the primary when needed; streaming replication does not itself supply safe automatic failover.",
    "docsUrl": "https://www.postgresql.org/docs/current/warm-standby.html"
},
  aws: {
    shortLabel: 'RDS read replica',
    name: 'RDS for PostgreSQL read replica',
    note: 'Asynchronous replication can return stale data. Route reads explicitly; a read replica is not the same as a Multi-AZ standby.',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html',
  },
  gcp: {
    shortLabel: 'Cloud SQL replica',
    name: 'Cloud SQL for PostgreSQL read replica',
    note: 'Read scaling with replication lag. A read replica does not provide automatic failover for the primary.',
    docsUrl: 'https://docs.cloud.google.com/sql/docs/postgres/replication',
  },
};
