import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import {
  Card,
  CardGrid,
  ConceptLink,
  DecisionChallenge,
  InlineCode,
  List,
  Paragraph,
  StepContent,
  StepSection,
} from '@/components/lesson/StepComponents';
import { urlShortenerChallenges } from '../challenges';

export const ScalingStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <StepContent>
      <StepSection title="Horizontal Scaling">
        <Paragraph>
          As traffic grows, a single application server will eventually run out of CPU or memory. Because our application servers are stateless (they rely on the database and cache for state), we can scale them horizontally by placing them behind a{' '}
          <ConceptLink conceptId="load-balancer" onConceptClick={onConceptClick}>
            load balancer
          </ConceptLink>.
        </Paragraph>
      </StepSection>

      <StepSection title="Scaling the Database">
        <Paragraph>
          Even with caching, the database remains a critical chokepoint for writes and cache misses. We scale the database in stages:
        </Paragraph>
        <List>
          <li>
            <strong>Read Replicas:</strong> We can configure a Primary-Replica setup. Writes go to the primary node, while reads (cache misses) go to read replicas. A trade-off here is <em>replication lag</em>: if a user creates a link and immediately queries it on a replica, it might not be there yet.
          </li>
          <li>
            <strong>Partitioning (Sharding):</strong> At extreme scale, when storage or write throughput exceeds a single machine's capacity, we partition the database. For a URL shortener, hashing the <InlineCode>short_code</InlineCode> and distributing records across multiple database nodes is the standard approach.
          </li>
        </List>
      </StepSection>

      <StepSection>
        <CardGrid>
          <Card title="Phase 1: Startup">
            Single App Server, Single Database. Fast iteration, easy deployments, low cost.
          </Card>
          <Card title="Phase 2: Growth">
            Load Balancer, Multiple App Servers, Redis Cache introduced to offload DB reads.
          </Card>
          <Card title="Phase 3: Scale">
            Database Read Replicas, Multi-AZ deployment, automated scaling groups.
          </Card>
        </CardGrid>
      </StepSection>

      <StepSection>
        <DecisionChallenge challenge={urlShortenerChallenges['rate-limiting-placement']!} />
      </StepSection>
    </StepContent>
  );
};
