import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export const BaselineStep: FC<StepComponentProps> = () => (
  <StepContent>
    <StepSection title="The simplest complete boundary">
      <Paragraph>{"Start with a client, one application server, and PostgreSQL. The database owns mappings and idempotency records. This is a starting point to benchmark, not the final burst-capacity claim. Safety checks are application responsibilities; their external reputation dependency is collapsed into the app box."}</Paragraph>
    </StepSection>
    <StepSection title="The create flow">
      <Paragraph>{"Authenticate, enforce the creation budget, validate URL/alias/expiry, and check reputation before taking database locks. In one transaction claim (owner, idempotency key), bind the payload hash, generate a random code or use the requested alias, insert the mapping, and save the result. Concurrent identical retries return that result. Generated collisions retry; custom-alias conflicts return 409."}</Paragraph>
      <Paragraph>{"Acknowledge 201 only after the configured durable commit boundary. A timeout after commit is resolved through the request ledger. Do not make a threat-intelligence network call while holding a transaction open."}</Paragraph>
    </StepSection>
    <StepSection title="The redirect flow">
      <Paragraph>{"Look up the mapping on the primary, check ACTIVE and expires_at using a synchronized server clock, then return 302 + no-store. Missing or inactive links return 404; failures to establish validity return 503."}</Paragraph>

    </StepSection>
    <StepSection title="What the acknowledgement proves">
      <Paragraph>{"A successful create acknowledgement proves that the mapping and request result crossed the configured database durability boundary. A redirect response only provides a destination; it does not prove that a person loaded it. The core architecture makes no complete click-counting promise."}</Paragraph>
    </StepSection>
<Callout label="Defend the baseline">A create response is lost after commit. Explain how the same request key recovers the original code, and why a code uniqueness constraint alone is insufficient.</Callout>
  </StepContent>
);
