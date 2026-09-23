import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import {
  Callout,
  Card,
  CardGrid,
  List,
  Paragraph,
  StepContent,
  StepSection,
} from '@/components/lesson/StepComponents';

export const RecapStep: FC<StepComponentProps> = () => {
  return (
    <StepContent>
      <StepSection title="Architecture Summary">
        <Paragraph>
          We have designed a highly scalable and resilient URL shortener. 
          By starting with a simple monolithic architecture and progressively addressing bottlenecks, we arrived at a robust distributed system.
        </Paragraph>
        <Paragraph>
          <strong>Key Decisions Made:</strong>
        </Paragraph>
        <List>
          <li>We used Base62 encoding for compact, URL-safe identifiers.</li>
          <li>We adopted a Cache-Aside pattern with Redis to protect the database from heavy read traffic.</li>
          <li>We scaled the application horizontally behind a Load Balancer for high availability.</li>
          <li>We chose 302 redirects (or parameterized 301s) assuming accurate analytics were a business requirement.</li>
        </List>
      </StepSection>

      <StepSection title="Interview Follow-up Questions">
        <Paragraph>
          In a real system design interview, your interviewer will likely probe the edges of your design. Think about how you would answer these advanced questions:
        </Paragraph>
        <CardGrid>
          <Card title="Analytics at Scale">
            "How would you handle analytics (click counts, geographic data) if a link suddenly gets 100,000 clicks per second?"
          </Card>
          <Card title="Custom Domains">
            "What architectural changes are needed to allow enterprise users to use their own domains (e.g., link.acme.com)?"
          </Card>
          <Card title="Data Lifecycle">
            "How would you efficiently implement and enforce URL expiration without bloating the database over years?"
          </Card>
        </CardGrid>
      </StepSection>

      <Callout label="Self Review" variant="default">
        Can you trace the path of a request from the client, through the load balancer, application server, cache, and database? If so, you've mastered the core concepts of this design!
      </Callout>
    </StepContent>
  );
};
