import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, Callout, CodeBlock, ConceptLink } from '@/components/lesson/StepComponents';

export const ApiDataStep: FC<StepComponentProps> = ({ onConceptClick }) => (
  <StepContent>
    <StepSection title="API Endpoints">
      <Paragraph>{"POST /api/urls authenticates the owner, validates the destination and alias, and requires Idempotency-Key. Bind (owner_id, key) to a canonical payload hash and committed result. The same key and payload returns the existing result; changed payload returns 409. A lost response is unknown, so retry that key, not a new operation."}</Paragraph>
      <CodeBlock language="http" code={"POST /api/urls\nIdempotency-Key: <stable operation key>\nContent-Type: application/json\n\n{\"long_url\":\"https://example.com/article\",\"custom_alias\":\"my-link\",\n \"expires_at\":\"2027-12-31T23:59:59Z\"}\n\nHTTP/1.1 201 Created\nLocation: /api/urls/my-link\nETag: \"1\"\nCache-Control: no-store\n\n{\"short_code\":\"my-link\",\"short_url\":\"https://short.url/my-link\"}"} />
      <Paragraph>{"GET /:short_code checks active state and absolute expiry, then returns the following response. HEAD performs the same validity lookup and returns the corresponding status and headers without a response body; reject other methods on this route with 405. Unknown, expired, and deleted public codes consistently return 404 with no-store."}</Paragraph>
      <CodeBlock language="http" code={"HTTP/1.1 302 Found\nLocation: https://example.com/article\nCache-Control: no-store"} />
      <Paragraph>{"GET /api/urls/{code} authenticates the owner and reads the primary, returning mapping state and a strong ETag derived from version, with no-store. Creation and successful edits return that ETag too. Use it in If-Match for PATCH or DELETE; a missing precondition returns 428. This management lookup is separate from the public redirect route."}</Paragraph>
      <Paragraph>{"PATCH /api/urls/{code} and DELETE /api/urls/{code} require owner authorization and If-Match against the mapping version. A stale version gets 412; a successful mutation returns the new version or 204 after commit. DELETE makes a tombstone, not a reusable alias. Edits repeat destination safety checks. Public redirects may still reflect the previous state for up to the 30-second internal freshness window; the cache page defines that contract."}</Paragraph>
    </StepSection>
    <StepSection title="Validation and route ownership">
      <Paragraph>{"Generated codes use seven Base62 characters. Custom aliases allow 3–32 ASCII letters, digits, hyphen, or underscore, case-sensitively. Store up to 32 characters with deterministic case-sensitive uniqueness. Reject malformed/encoded path separators and reserve api, healthz, assets, robots.txt, and sitemap.xml, including case variants; route service paths before the code matcher. Apply the same namespace restrictions to generated candidates."}</Paragraph>
      <Paragraph>{"Accept only parsed http/https destinations, reject credentials and control characters, bound URL length (illustratively 2,048 bytes), and require future UTC expiry when supplied. Perform synchronous reputation checks before activation; unsafe input is rejected and unavailable safety checks return a retryable error. Reputation checks reduce known threats, not future compromise. A scanner that fetches URLs must isolate egress and revalidate DNS/redirect targets to prevent SSRF."}</Paragraph>
    </StepSection>
    <StepSection title="Database Schema">
      <CodeBlock language="sql" code={"CREATE TABLE urls (\n  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  owner_id BIGINT NOT NULL,\n  short_code VARCHAR(32) COLLATE \"C\" UNIQUE NOT NULL,\n  long_url TEXT NOT NULL,\n  state TEXT NOT NULL CHECK (state IN ('ACTIVE','DELETED','BLOCKED')),\n  version BIGINT NOT NULL DEFAULT 1,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  expires_at TIMESTAMPTZ NULL\n);\n-- Same transaction as create:\n-- requests UNIQUE(owner_id, idempotency_key), payload_hash, result_code\n-- Same transaction as edit/delete/block:\n-- invalidation_outbox UNIQUE(short_code, version)"} />
      <Paragraph>The UNIQUE constraint creates a database index for lookup and uniqueness enforcement. Explore the <ConceptLink conceptId="database-index" onConceptClick={onConceptClick}>database index</ConceptLink> separately; the index does not enforce request idempotency.</Paragraph>
      <Paragraph>{"Keep click aggregates out of the mapping row: updating one counter per redirect creates a hot write key. Retain create-operation mappings or tombstones for the supported lifecycle; an expired replay key returns an explicit operation-expired error and status lookup, never silently creates again. Publish that retention contract and require deliberate user action for a new creation."}</Paragraph>
    </StepSection>
<Callout label="Check the boundary">Can two owners claim the same alias? Can one owner retry the same request through two servers? These require different unique constraints.</Callout>
  </StepContent>
);
