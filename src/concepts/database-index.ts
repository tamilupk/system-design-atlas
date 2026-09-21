import type { SharedConcept } from '@/types/concept';

export const databaseIndexConcept: SharedConcept = {
  id: 'database-index',
  title: 'Database Index',
  summary: 'A data structure that improves the speed of data retrieval operations on a database table at the cost of additional writes and storage space.',
  explanation: 'A database index creates a separate data structure (commonly a B-tree or hash table) that maintains pointers to rows in a table, organized by one or more column values. Without an index, the database must scan every row to find matching records (a full table scan). With an index, it can locate rows in logarithmic time.\n\nIndexes are critical for query performance but come with trade-offs: each index must be updated on every write operation (INSERT, UPDATE, DELETE on indexed columns), consuming additional I/O and storage. Over-indexing can slow write-heavy workloads significantly.\n\nCommon types include B-tree indexes (range queries), hash indexes (exact lookups), composite indexes (multi-column), and specialized types like full-text or spatial indexes.',
  role: 'Accelerates database read queries by avoiding full table scans.',
  tradeoffs: [
    { aspect: 'Read performance', pros: 'Dramatically faster lookups, from O(n) full scans to O(log n) B-tree traversals', cons: 'Unused or poorly chosen indexes waste space without improving queries' },
    { aspect: 'Write performance', pros: 'Unique indexes enforce data integrity constraints efficiently', cons: 'Every write must update all affected indexes, adding latency and I/O' },
    { aspect: 'Storage', pros: 'Covering indexes can serve queries entirely from the index', cons: 'Indexes consume additional disk space, sometimes substantial for wide or many indexes' },
  ],
  failureModes: [
    'Missing index on a frequently queried column causes slow full-table scans under load',
    'Index bloat after many updates/deletes without maintenance (especially in PostgreSQL)',
    'Query planner ignores an index if table statistics are outdated or if a full scan is estimated cheaper',
    'Too many indexes on a write-heavy table cause write amplification and increased replication lag',
  ],
  relatedConceptIds: ['cache'],
};
