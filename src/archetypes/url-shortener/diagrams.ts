import type { DiagramDefinition } from '@/types/diagram';

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
        { id: 'client', label: 'Client', role: 'client', x: 100, y: 200, conceptId: undefined, description: 'Web browser or mobile app making HTTP requests' },
        { id: 'app-server', label: 'App Server', role: 'service', x: 350, y: 200, conceptId: undefined, description: 'Stateless application handling create and redirect requests' },
        { id: 'database', label: 'Database', role: 'database', x: 600, y: 200, conceptId: 'database-index', description: 'Persistent storage for URL mappings with unique index on short codes' },
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
            { label: '301/302 Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server sends an HTTP redirect to the original long URL.' },
          ],
        },
      ],
    },
    'with-cache': {
      id: 'with-cache',
      nodes: [
        { id: 'client', label: 'Client', role: 'client', x: 100, y: 200, description: 'Web browser or mobile app' },
        { id: 'app-server', label: 'App Server', role: 'service', x: 350, y: 200, description: 'Stateless application server' },
        { id: 'cache-node', label: 'Cache (Redis)', role: 'cache', x: 350, y: 60, conceptId: 'cache', description: 'In-memory cache for hot URL mappings' },
        { id: 'database', label: 'Database', role: 'database', x: 600, y: 200, conceptId: 'database-index', description: 'Persistent URL mapping storage' },
      ],
      edges: [
        { id: 'client-to-app', from: 'client', to: 'app-server', label: 'HTTP' },
        { id: 'app-to-cache', from: 'app-server', to: 'cache-node', label: 'GET' },
        { id: 'cache-to-app', from: 'cache-node', to: 'app-server', label: 'Hit/Miss', style: 'dashed' },
        { id: 'app-to-db', from: 'app-server', to: 'database', label: 'Query' },
        { id: 'db-to-app', from: 'database', to: 'app-server', label: 'Result', style: 'dashed' },
        { id: 'app-to-client', from: 'app-server', to: 'client', label: 'Redirect', style: 'dashed' },
      ],
      flowSequences: [
        {
          id: 'cache-hit-flow',
          title: 'Cache Hit (Fast Path)',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client requests a short URL.' },
            { label: 'Check cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server checks the cache for the short code mapping.' },
            { label: 'Cache hit!', edgeIds: ['cache-to-app'], highlightNodeIds: ['cache-node', 'app-server'], description: 'Cache returns the long URL — database is never touched.' },
            { label: 'Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server redirects the client to the long URL.' },
          ],
        },
        {
          id: 'cache-miss-flow',
          title: 'Cache Miss (Slow Path)',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-app'], highlightNodeIds: ['client', 'app-server'], description: 'Client requests a short URL.' },
            { label: 'Check cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server checks the cache.' },
            { label: 'Cache miss', edgeIds: ['cache-to-app'], highlightNodeIds: ['cache-node', 'app-server'], description: 'Short code not found in cache.' },
            { label: 'Query database', edgeIds: ['app-to-db'], highlightNodeIds: ['app-server', 'database'], description: 'App server falls back to querying the database.' },
            { label: 'Store in cache', edgeIds: ['app-to-cache'], highlightNodeIds: ['app-server', 'cache-node'], description: 'App server writes the result to cache for future requests.' },
            { label: 'Redirect', edgeIds: ['app-to-client'], highlightNodeIds: ['app-server', 'client'], description: 'App server redirects the client.' },
          ],
        },
      ],
    },
    scaled: {
      id: 'scaled',
      nodes: [
        { id: 'client', label: 'Client', role: 'client', x: 60, y: 200, description: 'Web browser or mobile app' },
        { id: 'load-balancer-node', label: 'Load Balancer', role: 'loadbalancer', x: 230, y: 200, conceptId: 'load-balancer', description: 'Distributes traffic across app server instances' },
        { id: 'app-server-1', label: 'App Server 1', role: 'service', x: 420, y: 120, description: 'Stateless application instance' },
        { id: 'app-server-2', label: 'App Server 2', role: 'service', x: 420, y: 280, description: 'Stateless application instance' },
        { id: 'cache-node', label: 'Cache (Redis)', role: 'cache', x: 600, y: 60, conceptId: 'cache', description: 'Shared in-memory cache cluster' },
        { id: 'db-primary', label: 'DB Primary', role: 'database', x: 600, y: 200, conceptId: 'database-index', description: 'Primary database handling writes' },
        { id: 'db-replica', label: 'DB Replica', role: 'database', x: 600, y: 340, conceptId: 'database-index', description: 'Read replica for scaling read queries' },
      ],
      edges: [
        { id: 'client-to-lb', from: 'client', to: 'load-balancer-node', label: 'HTTPS' },
        { id: 'lb-to-app1', from: 'load-balancer-node', to: 'app-server-1' },
        { id: 'lb-to-app2', from: 'load-balancer-node', to: 'app-server-2' },
        { id: 'app1-to-cache', from: 'app-server-1', to: 'cache-node', label: 'GET/SET' },
        { id: 'app2-to-cache', from: 'app-server-2', to: 'cache-node', label: 'GET/SET' },
        { id: 'app1-to-db', from: 'app-server-1', to: 'db-primary', label: 'Write' },
        { id: 'app2-to-db', from: 'app-server-2', to: 'db-primary', label: 'Write' },
        { id: 'app1-to-replica', from: 'app-server-1', to: 'db-replica', label: 'Read', style: 'dashed' },
        { id: 'app2-to-replica', from: 'app-server-2', to: 'db-replica', label: 'Read', style: 'dashed' },
        { id: 'db-to-replica', from: 'db-primary', to: 'db-replica', label: 'Replication', style: 'dashed' },
      ],
      flowSequences: [
        {
          id: 'scaled-redirect',
          title: 'Scaled Redirect Flow',
          events: [
            { label: 'GET /:code', edgeIds: ['client-to-lb'], highlightNodeIds: ['client', 'load-balancer-node'], description: 'Client request hits the load balancer.' },
            { label: 'Route to server', edgeIds: ['lb-to-app1'], highlightNodeIds: ['load-balancer-node', 'app-server-1'], description: 'Load balancer routes to an available app server.' },
            { label: 'Check cache', edgeIds: ['app1-to-cache'], highlightNodeIds: ['app-server-1', 'cache-node'], description: 'App server checks the shared cache.' },
            { label: 'Cache miss → read replica', edgeIds: ['app1-to-replica'], highlightNodeIds: ['app-server-1', 'db-replica'], description: 'On cache miss, query is routed to a read replica.' },
            { label: 'Redirect client', edgeIds: ['client-to-lb'], highlightNodeIds: ['app-server-1', 'client'], description: 'Response flows back through the load balancer to the client.' },
          ],
        },
      ],
    },
  },
};
