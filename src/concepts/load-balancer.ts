import type { SharedConcept } from '@/types/concept';

export const loadBalancerConcept: SharedConcept = {
  id: 'load-balancer',
  title: 'Load Balancer',
  summary: 'A component that distributes incoming network traffic across multiple servers to ensure no single server bears too much demand.',
  explanation: 'A load balancer acts as the entry point for client traffic, distributing requests across a pool of backend servers. This improves responsiveness, increases availability (if one server fails, traffic shifts to healthy ones), and enables horizontal scaling by adding more servers to the pool.\n\nLoad balancers operate at different layers: Layer 4 (transport) makes routing decisions based on IP and TCP/UDP ports, while Layer 7 (application) can inspect HTTP headers, URLs, and cookies for smarter routing.\n\nCommon algorithms include round-robin, least connections, weighted distribution, and consistent hashing. Health checks automatically remove unhealthy servers from the rotation.',
  role: 'Distributes traffic across multiple server instances to improve throughput and fault tolerance.',
  tradeoffs: [
    { aspect: 'Availability', pros: 'Automatic failover when servers go down; seamless to clients', cons: 'The load balancer itself becomes a potential single point of failure (mitigated by redundant LBs)' },
    { aspect: 'Scalability', pros: 'Enables horizontal scaling by adding servers behind the LB', cons: 'Stateful sessions require sticky sessions or externalized state, adding complexity' },
    { aspect: 'Complexity', pros: 'Abstracts backend topology from clients', cons: 'Adds network hop and potential latency; requires health check configuration and monitoring' },
  ],
  failureModes: [
    'Load balancer itself fails, making all backend servers unreachable (mitigate with active-passive or active-active LB pairs)',
    'Misconfigured health checks mark healthy servers as unhealthy or keep unhealthy servers in rotation',
    'Uneven load distribution due to long-lived connections or hot partitions',
    'SSL termination at the LB can become a CPU bottleneck under high TLS handshake rates',
  ],
  relatedConceptIds: ['cache'],
};
