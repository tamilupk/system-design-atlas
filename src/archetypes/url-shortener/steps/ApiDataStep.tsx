import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import {
  CodeBlock,
  ConceptLink,
  InlineCode,
  Paragraph,
  StepContent,
  StepSection,
} from '@/components/lesson/StepComponents';

export const ApiDataStep: FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <StepContent>
      <StepSection title="API Endpoints">
        <Paragraph>
          Our system needs two primary API endpoints: one for creating the short link, and one for redirecting the user when they click it.
        </Paragraph>

        <Paragraph>
          <strong>1. Create Short URL:</strong> The client sends the long URL and optional parameters (custom alias, expiration).
        </Paragraph>
        <CodeBlock
          language="json"
          code={`// POST /api/urls
// Request
{
  "long_url": "https://www.example.com/some/very/long/path/that/needs/shortening",
  "custom_alias": "my-link",
  "expires_at": "2025-12-31T23:59:59Z"
}

// Success Response (201 Created) - honors requested custom alias
{
  "short_code": "my-link",
  "short_url": "https://short.url/my-link",
  "created_at": "2024-03-10T10:00:00Z"
}

// Conflict Response (409 Conflict) - when custom alias is already claimed
{
  "error": "alias_already_taken",
  "message": "The custom alias 'my-link' is already in use. Please choose another alias."
}`}
        />

        <Paragraph>
          <strong>2. Redirect Endpoint:</strong> When a user navigates to the short URL, the server returns an HTTP redirect response with explicit caching directives.
        </Paragraph>
        <CodeBlock
          language="http"
          code={`// GET /:short_code (e.g., GET /my-link)

HTTP/1.1 302 Found
Location: https://www.example.com/some/very/long/path/that/needs/shortening
Cache-Control: private, max-age=90`}
        />
      </StepSection>

      <StepSection title="Database Schema">
        <Paragraph>
          For our relational database, we need a single table to store the mappings. We'll call this table <InlineCode>urls</InlineCode>.
        </Paragraph>
        <CodeBlock
          language="sql"
          code={`CREATE TABLE urls (
  id BIGINT PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  click_count BIGINT DEFAULT 0
);`}
        />
        <Paragraph>
          Notice the <InlineCode>UNIQUE</InlineCode> constraint on <InlineCode>short_code</InlineCode>.
          This constraint automatically creates a{' '}
          <ConceptLink conceptId="database-index" onConceptClick={onConceptClick}>
            database index
          </ConceptLink>,
          which ensures that lookups by short code are fast (O(log n) time complexity) rather than requiring a full table scan.
        </Paragraph>
      </StepSection>
    </StepContent>
  );
};
