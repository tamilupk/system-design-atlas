import type { DiagramDefinition, DiagramNode } from '@/types/diagram';

const CLIENT_NODE: DiagramNode = {
  id: 'client',
  label: 'Client',
  role: 'client',
  x: 70,
  y: 220,
  description: 'Web browser, mobile app, or external API consumer.',
  spec: {
    responsibilities: [
      'Initiates HTTP/HTTPS URL creation and redirect resolution requests.',
      'Follows HTTP 301/302/307 redirects according to Location response headers.',
      'Supplies Idempotency-Key on retried write operations to prevent duplicate creation.',
    ],
    inputsAndProtocols: [
      'User actions via Browser, Mobile App, or API SDK',
    ],
    outputsAndCodes: [
      'POST /api/v1/urls (JSON payload: { "url": "https://..." })',
      'GET /:shortCode (HTTP redirect request)',
    ],
    stateAndPersistence: 'Stateless on client device; may cache HTTP responses locally based on Cache-Control directives.',
    failureModes: [
      'Network dropped during in-flight write (mitigated by Idempotency-Key retry header).',
      'Stale browser redirect cache on 301 (mitigated by using 302/307 with explicit Cache-Control).',
    ],
    tradeoffs: [
      'Thin standard HTTP client ensures zero SDK dependency and universal cross-platform compatibility.',
    ],
  },
};

const LB_NODE: DiagramNode = {
  id: 'load-balancer-node',
  label: 'Load Balancer',
  role: 'loadbalancer',
  x: 240,
  y: 220,
  conceptId: 'load-balancer',
  description: 'High-availability reverse proxy and TLS termination layer.',
  spec: {
    responsibilities: [
      'Terminates TLS (HTTPS) connections and offloads cryptographic CPU overhead.',
      'Evenly balances traffic across healthy stateless app server instances via round-robin or least-connections.',
      'Conducts periodic active health checks (GET /healthz every 5s) to evict failing nodes.',
    ],
    inputsAndProtocols: [
      'HTTPS (Port 443) from public internet / clients',
    ],
    outputsAndCodes: [
      'HTTP/1.1 or gRPC internal VPC routing to App Servers on Port 8080',
    ],
    stateAndPersistence: 'Stateless Layer 7 proxy; no session affinity required.',
    failureModes: [
      'Single point of failure (mitigated by Active-Passive or Anycast dual-AZ deployment).',
      'SYN flood / DDoS saturation (mitigated by upstream Cloudflare/edge DDoS scrubbing).',
    ],
    tradeoffs: [
      'L7 routing allows intelligent path routing and TLS termination with negligible (~0.5ms) latency cost compared to raw L4 forwarding.',
    ],
  },
};

const APP_SERVER_1_NODE: DiagramNode = {
  id: 'app-server-1',
  label: 'App Server 1',
  role: 'service',
  x: 430,
  y: 150,
  description: 'Stateless application server handling writes, reads, and Base62 logic.',
  spec: {
    responsibilities: [
      'Validates URLs, rate limits requests, and parses Base62 short codes.',
      'Implements cache-aside read strategy: checks Redis, falls back to DB Replica, populates cache with TTL.',
      'Generates 7-character Base62 keys and executes transactional INSERT with collision retry loop.',
      'Returns HTTP 302/307 on redirects, and HTTP 201 Created or 409 Conflict on writes.',
    ],
    inputsAndProtocols: [
      'HTTP/1.1 from Load Balancer',
      'TCP RESP from Redis',
      'PostgreSQL wire protocol (lib/pq) over internal VPC',
    ],
    outputsAndCodes: [
      'HTTP 302/307 Found (Location header)',
      'HTTP 201 Created (JSON { "short_url": "...", "short_code": "..." })',
      'HTTP 409 Conflict (custom alias already taken)',
      'HTTP 429 Too Many Requests (rate limited)',
    ],
    stateAndPersistence: 'Strictly stateless; all session, cache, and entity state resides in Redis and PostgreSQL.',
    failureModes: [
      'OOM or CPU starvation under thundering herd (mitigated by Singleflight request coalescing).',
      'Database connection pool starvation (mitigated by strict timeouts: 200ms DB, 20ms Redis).',
    ],
    tradeoffs: [
      'Unified stateless server fleet simplifies deployment and autoscaling; can be split into dedicated redirect and write clusters at ultra-high scale (>100k QPS).',
    ],
  },
};

const APP_SERVER_2_NODE: DiagramNode = {
  id: 'app-server-2',
  label: 'App Server 2',
  role: 'service',
  x: 430,
  y: 290,
  description: 'Stateless application server handling writes, reads, and Base62 logic.',
  spec: {
    responsibilities: [
      'Identical replica to App Server 1; provides horizontal scale and fault tolerance.',
      'Processes redirect requests concurrently during peak traffic spikes.',
    ],
    inputsAndProtocols: [
      'HTTP/1.1 from Load Balancer',
      'TCP RESP from Redis',
      'PostgreSQL wire protocol (lib/pq)',
    ],
    outputsAndCodes: [
      'HTTP 302/307 Found',
      'HTTP 201 Created',
      'HTTP 409 Conflict',
    ],
    stateAndPersistence: 'Strictly stateless.',
    failureModes: [
      'Instance failure is absorbed automatically as the Load Balancer redistributes traffic to healthy peers.',
    ],
    tradeoffs: [
      'Stateless architecture allows rapid horizontal autoscaling via Kubernetes HPA based on CPU/Request count.',
    ],
  },
};

const CACHE_NODE: DiagramNode = {
  id: 'cache-node',
  label: 'Cache (Redis)',
  role: 'cache',
  x: 660,
  y: 70,
  conceptId: 'cache',
  description: 'In-memory Redis cluster caching hot redirect mappings in RAM.',
  spec: {
    responsibilities: [
      'Stores hot short_code -> long_url mappings in RAM to absorb 95%+ of redirect reads.',
      'Enforces TTL-based expiration and volatile-lru eviction under memory pressure.',
      'Guarantees sub-millisecond redirect read response time (p99 < 2ms).',
    ],
    inputsAndProtocols: [
      'Redis RESP protocol over TCP: GET url:{short_code}, SETEX url:{short_code} {ttl} {long_url}',
    ],
    outputsAndCodes: [
      'String value (long_url) on cache hit; nil on cache miss',
    ],
    stateAndPersistence: 'In-memory (RAM) transient key-value store with volatile-lru eviction and optional Redis Sentinel failover.',
    failureModes: [
      'Redis node outage (mitigated by Sentinel multi-replica failover and circuit-breaker fallback to DB).',
      'Cache stampede on hot key expiry (mitigated by Singleflight coalescing on app servers).',
      'Hot key memory saturation (mitigated by local in-process L1 cache with 10s TTL for mega-popular URLs).',
    ],
    tradeoffs: [
      'Memory cost ($) vs database scaling cost: caching 20% working set in 10GB RAM eliminates 95% of database hardware requirements.',
    ],
  },
};

const DB_PRIMARY_NODE: DiagramNode = {
  id: 'db-primary',
  label: 'DB Primary',
  role: 'database',
  x: 660,
  y: 220,
  conceptId: 'database-index',
  description: 'Primary relational database (PostgreSQL) for writes and ACID guarantees.',
  spec: {
    responsibilities: [
      'Authoritative system of record for all short URL mappings and custom aliases.',
      'Enforces relational integrity: PRIMARY KEY on id, UNIQUE constraint on short_code.',
      'Appends all changes to Write-Ahead Log (WAL) and streams replication events to Read Replicas.',
    ],
    inputsAndProtocols: [
      'PostgreSQL wire protocol over TCP: INSERT INTO urls (short_code, long_url, user_id, expires_at) VALUES (...)',
    ],
    outputsAndCodes: [
      'SQL success row count / inserted ID; SQLSTATE 23505 (unique_violation) on collision',
    ],
    stateAndPersistence: 'ACID transactional persistent relational storage on NVMe SSD with WAL archiving for PITR.',
    failureModes: [
      'Primary database node crash (mitigated by automated failover to standby replica).',
      'Connection exhaustion (mitigated by PgBouncer transaction-level connection pooling).',
    ],
    tradeoffs: [
      'Postgres provides strict uniqueness enforcement and reliable B-Tree indexing; single-primary write throughput easily handles 1,000+ creates/sec.',
    ],
  },
};

const DB_REPLICA_NODE: DiagramNode = {
  id: 'db-replica',
  label: 'DB Replica',
  role: 'database',
  x: 660,
  y: 370,
  conceptId: 'database-index',
  description: 'Read-only replica servicing cache misses and analytics queries.',
  spec: {
    responsibilities: [
      'Services read requests that miss the cache, offloading read queries from the primary database.',
      'Continuously consumes streaming WAL records from the primary database instance.',
      'Enables horizontal scaling of read capacity by adding replica instances as traffic grows.',
    ],
    inputsAndProtocols: [
      'PostgreSQL streaming replication protocol from Primary',
      'SELECT long_url, expires_at FROM urls WHERE short_code = $1 from App Servers',
    ],
    outputsAndCodes: [
      'Relational row data (long_url, expires_at) or empty result set (404 Not Found)',
    ],
    stateAndPersistence: 'Read-only mirror of primary database with replication lag typically between 10ms and 500ms.',
    failureModes: [
      'Replication lag spike during bulk operations (mitigated by read-your-own-writes routing for fresh links).',
      'Replica node failure (mitigated by load balancer distributing across multiple read replicas).',
    ],
    tradeoffs: [
      'Asynchronous replication keeps write latency on the primary minimal at the expense of potential slight replication lag on reads.',
    ],
  },
};

export const urlShortenerDiagrams: DiagramDefinition = {
  states: {
    empty: {
      id: 'empty',
      nodes: [],
      edges: [],
      flowSequences: [],
    },
    baseline: {
      id: 'baseline',
      nodes: [
        { ...CLIENT_NODE, x: 100, y: 200 },
        { ...APP_SERVER_1_NODE, id: 'app-server', label: 'App Server', x: 370, y: 200 },
        { ...DB_PRIMARY_NODE, id: 'database', label: 'Database', x: 640, y: 200 },
      ],
      edges: [
        { id: 'client-to-app', from: 'client', to: 'app-server', label: 'HTTP' },
        { id: 'app-to-db', from: 'app-server', to: 'database', label: 'Query' },
        { id: 'db-to-app', from: 'database', to: 'app-server', label: 'Result', style: 'dashed' },
        { id: 'app-to-client', from: 'app-server', to: 'client', label: 'Response', style: 'dashed' },
      ],
      flowSequences: [
        {
          id: 'create-flow',
          title: 'Create Short URL',
          events: [
            { label: 'POST /api/urls', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client sends POST request with the long URL to create a short link.' },
            { label: 'Generate short code', edgeIds: [], highlightNodeIds: ['app-server'], description: 'App server generates a unique short code (random or sequential).' },
            { label: 'INSERT mapping', edgeIds: ['app-to-db'], highlightNodeIds: ['app-server', 'database'], description: 'App server stores the short_code → long_url mapping in the database.' },
            { label: 'Return short URL', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server returns the complete short URL to the client.' },
          ],
        },
        {
          id: 'redirect-flow',
          title: 'Redirect Request',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client requests the short URL, which hits the app server.' },
            { label: 'Lookup mapping', edgeIds: ['app-to-db'], highlightNodeIds: ['app-server', 'database'], description: 'App server queries the database for the long URL.' },
            { label: 'Return long URL', edgeIds: ['db-to-app'], highlightNodeIds: ['database', 'app-server'], description: 'Database returns the mapping result.' },
            { label: '302 Found Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server sends an HTTP redirect to the original long URL.' },
          ],
        },
      ],
    },
    'with-cache': {
      id: 'with-cache',
      nodes: [
        { ...CLIENT_NODE, x: 100, y: 200 },
        { ...APP_SERVER_1_NODE, id: 'app-server', label: 'App Server', x: 370, y: 200 },
        { ...CACHE_NODE, x: 370, y: 60 },
        { ...DB_PRIMARY_NODE, id: 'database', label: 'Database', x: 640, y: 200 },
      ],
      edges: [
        { id: 'client-to-app', from: 'client', to: 'app-server', label: 'HTTP' },
        { id: 'app-to-cache', from: 'app-server', to: 'cache-node', label: 'GET/SET' },
        { id: 'app-to-db', from: 'app-server', to: 'database', label: 'Query' },
        { id: 'db-to-app', from: 'database', to: 'app-server', label: 'Result', style: 'dashed' },
        { id: 'app-to-client', from: 'app-server', to: 'client', label: 'Redirect', style: 'dashed' },
      ],
      flowSequences: [
        {
          id: 'cache-hit-flow',
          title: 'Cache Hit (Fast Path: p99 < 2ms)',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client requests a short URL.' },
            { label: 'Check cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server queries Redis: GET url:{code}.' },
            { label: 'Cache hit!', edgeIds: ['app-to-cache'], highlightNodeIds: ['cache-node', 'app-server'], description: 'Redis returns the long URL from RAM — database is bypassed.' },
            { label: '302 Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server redirects client to the long URL with Cache-Control header.' },
          ],
        },
        {
          id: 'cache-miss-flow',
          title: 'Cache Miss (Populate Path)',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client requests a short URL.' },
            { label: 'Check cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server queries Redis: key not found (nil).' },
            { label: 'Query database', edgeIds: ['app-to-db'], highlightNodeIds: ['app-server', 'database'], description: 'App server queries database using indexed lookup.' },
            { label: 'Store in cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server caches mapping: SETEX url:{code} 86400 {long_url}.' },
            { label: '302 Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server sends 302 Found redirect to client.' },
          ],
        },
      ],
    },
    scaled: {
      id: 'scaled',
      nodes: [
        CLIENT_NODE,
        LB_NODE,
        APP_SERVER_1_NODE,
        APP_SERVER_2_NODE,
        CACHE_NODE,
        DB_PRIMARY_NODE,
        DB_REPLICA_NODE,
      ],
      edges: [
        { id: 'client-to-lb', from: 'client', to: 'load-balancer-node', label: 'HTTPS' },
        { id: 'lb-to-app1', from: 'load-balancer-node', to: 'app-server-1', label: 'Route', labelPosition: 0.5 },
        { id: 'lb-to-app2', from: 'load-balancer-node', to: 'app-server-2', label: 'Route', labelPosition: 0.5 },
        { id: 'app1-to-cache', from: 'app-server-1', to: 'cache-node', label: 'GET/SET', labelPosition: 0.35 },
        { id: 'app2-to-cache', from: 'app-server-2', to: 'cache-node', label: 'GET/SET', labelPosition: 0.78 },
        { id: 'app1-to-db', from: 'app-server-1', to: 'db-primary', label: 'Write', labelPosition: 0.45 },
        { id: 'app2-to-db', from: 'app-server-2', to: 'db-primary', label: 'Write', labelPosition: 0.55 },
        { id: 'app1-to-replica', from: 'app-server-1', to: 'db-replica', label: 'Read', style: 'dashed', labelPosition: 0.22 },
        { id: 'app2-to-replica', from: 'app-server-2', to: 'db-replica', label: 'Read', style: 'dashed', labelPosition: 0.4 },
        { id: 'db-to-replica', from: 'db-primary', to: 'db-replica', label: 'Replication', style: 'dashed', labelPosition: 0.5 },
      ],
      flowSequences: [
        {
          id: 'write-flow',
          title: '1. Write Path: URL Creation',
          events: [
            { label: 'POST /api/v1/urls', edgeIds: ['client-to-lb'], highlightNodeIds: ['client', 'load-balancer-node'], description: 'Client sends POST request with long URL and Idempotency-Key header.' },
            { label: 'LB routes to server', edgeIds: ['lb-to-app1'], highlightNodeIds: ['load-balancer-node', 'app-server-1'], description: 'Load balancer distributes the write request to App Server 1.' },
            { label: 'Generate Base62 code', edgeIds: [], highlightNodeIds: ['app-server-1'], description: 'App server validates long URL and encodes a 7-character Base62 string.' },
            { label: 'INSERT into DB Primary', edgeIds: ['app1-to-db'], highlightNodeIds: ['app-server-1', 'db-primary'], description: 'App server commits record to Primary DB with unique index constraint.' },
            { label: 'Populate cache & return 201', edgeIds: ['app1-to-cache', 'lb-to-app1', 'client-to-lb'], highlightNodeIds: ['app-server-1', 'cache-node', 'client'], description: 'App server caches mapping in Redis and returns HTTP 201 Created with short URL.' },
          ],
        },
        {
          id: 'read-cache-hit',
          title: '2. Read Path: Fast Cache Hit (p99 < 2ms)',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-lb'], highlightNodeIds: ['client', 'load-balancer-node'], description: 'Client issues redirect request for popular short code.' },
            { label: 'Route to App Server 1', edgeIds: ['lb-to-app1'], highlightNodeIds: ['load-balancer-node', 'app-server-1'], description: 'Load balancer routes request to an available app worker instance.' },
            { label: 'Redis Cache Hit', edgeIds: ['app1-to-cache'], highlightNodeIds: ['app-server-1', 'cache-node'], description: 'App Server retrieves long URL directly from in-memory Redis cluster. Database is untouched.' },
            { label: 'HTTP 302 Found Redirect', edgeIds: ['lb-to-app1', 'client-to-lb'], highlightNodeIds: ['app-server-1', 'client'], description: 'App Server sends 302 Found with Location header and Cache-Control: max-age=86400.' },
          ],
        },
        {
          id: 'read-cache-miss',
          title: '3. Read Path: Cache Miss & Populate',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-lb'], highlightNodeIds: ['client', 'load-balancer-node'], description: 'Client requests a cold or un-cached short link.' },
            { label: 'Route to App Server 2', edgeIds: ['lb-to-app2'], highlightNodeIds: ['load-balancer-node', 'app-server-2'], description: 'Load balancer forwards request to App Server 2.' },
            { label: 'Cache Miss', edgeIds: ['app2-to-cache'], highlightNodeIds: ['app-server-2', 'cache-node'], description: 'Redis reports key not found (nil).' },
            { label: 'Query Read Replica', edgeIds: ['app2-to-replica'], highlightNodeIds: ['app-server-2', 'db-replica'], description: 'App Server queries DB Read Replica using indexed short_code lookup.' },
            { label: 'Populate Cache', edgeIds: ['app2-to-cache'], highlightNodeIds: ['app-server-2', 'cache-node'], description: 'App Server writes mapping to Redis with TTL to absorb future hits.' },
            { label: 'Redirect Client', edgeIds: ['lb-to-app2', 'client-to-lb'], highlightNodeIds: ['app-server-2', 'client'], description: 'App Server returns HTTP 302 Found redirect to the client.' },
          ],
        },
        {
          id: 'replication-flow',
          title: '4. Asynchronous DB Replication',
          events: [
            { label: 'Write committed to Primary', edgeIds: ['app1-to-db'], highlightNodeIds: ['app-server-1', 'db-primary'], description: 'Write transaction commits on DB Primary.' },
            { label: 'Write-Ahead Log generated', edgeIds: [], highlightNodeIds: ['db-primary'], description: 'PostgreSQL flushes transaction to Write-Ahead Log (WAL) on NVMe storage.' },
            { label: 'Streaming WAL replication', edgeIds: ['db-to-replica'], highlightNodeIds: ['db-primary', 'db-replica'], description: 'WAL sender streams replication stream asynchronously to DB Replica.' },
            { label: 'Replica applies WAL', edgeIds: [], highlightNodeIds: ['db-replica'], description: 'DB Replica applies changes; replication lag is typically 10-50ms.' },
          ],
        },
        {
          id: 'failover-flow',
          title: '5. Degraded Fallback & Circuit Breaker',
          events: [
            { label: 'Cache blip or outage', edgeIds: ['app1-to-cache'], highlightNodeIds: ['cache-node'], description: 'Redis cluster node encounters transient network partition or failover.' },
            { label: 'Circuit breaker trips', edgeIds: [], highlightNodeIds: ['app-server-1', 'app-server-2'], description: 'App server circuit breaker trips after 2 timeouts (20ms threshold) to prevent thread exhaustion.' },
            { label: 'Fallback to Read Replica', edgeIds: ['app1-to-replica', 'app2-to-replica'], highlightNodeIds: ['app-server-1', 'app-server-2', 'db-replica'], description: 'App servers temporarily route reads directly to DB Replicas with Singleflight request coalescing.' },
            { label: 'Service remains available', edgeIds: ['client-to-lb'], highlightNodeIds: ['client', 'load-balancer-node'], description: 'Redirects continue functioning seamlessly in degraded mode until Redis recovers.' },
          ],
        },
      ],
    },
  },
};
