import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import {
  Callout,
  InlineCode,
  List,
  Paragraph,
  StepContent,
  StepSection,
} from '@/components/lesson/StepComponents';

export const BaselineStep: FC<StepComponentProps> = () => {
  return (
    <StepContent>
      <StepSection title="The Simplest Architecture">
        <Paragraph>
          Before scaling, it's crucial to understand the baseline architecture. The simplest viable system consists of three main components: a Client, a single Application Server, and a single Relational Database. This basic structure is what you see modeled in the diagram.
        </Paragraph>
      </StepSection>

      <StepSection title="The Create Flow">
        <Paragraph>
          When a user wants to shorten a URL:
        </Paragraph>
        <List ordered>
          <li>The client sends a POST request to the application server with the long URL.</li>
          <li>The server generates a unique short code.</li>
          <li>The server inserts a new record into the database containing the short code and the long URL.</li>
          <li>The server returns the generated short URL to the client.</li>
        </List>
      </StepSection>

      <StepSection title="The Redirect Flow">
        <Paragraph>
          When a user clicks a short link:
        </Paragraph>
        <List ordered>
          <li>The client sends a GET request for the short code path.</li>
          <li>The application server queries the database by the short code.</li>
          <li>The database uses its unique index to quickly find the record and returns the long URL.</li>
          <li>The application server sends an HTTP 301/302 response to the client with the long URL in the <InlineCode>Location</InlineCode> header.</li>
        </List>
      </StepSection>

      <Callout label="Why Start Here?" variant="default">
        This monolithic setup works perfectly fine for low-traffic applications or internal tools. It is simple to deploy, easy to debug, and requires minimal operational overhead. Both the create and redirect flows are demonstrated in the flow controls attached to the diagram.
      </Callout>
    </StepContent>
  );
};
