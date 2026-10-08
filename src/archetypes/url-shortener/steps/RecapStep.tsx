import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, Callout, CardGrid, Card } from '@/components/lesson/StepComponents';

export const RecapStep: FC<StepComponentProps> = () => (
  <StepContent>
    <StepSection title="Reconstruct the chosen design">
      <Paragraph>{"Start from the promises: public short codes, owner-controlled mutations, explicit expiry, and bounded edit propagation. Seven random Base62 characters with a unique-index retry loop fit the illustrative 40 creates/s average and 200/s peak; they do not provide authorization."}</Paragraph>
      <Paragraph>{"Creation: authenticate and rate-limit → validate alias, URL, and expiry → synchronous reputation check → atomically claim the idempotency key, insert the mapping, and save the result → acknowledge durable commit. Cache warmup is optional. Generated collisions retry; requested-alias conflicts return 409."}</Paragraph>
      <Paragraph>{"Redirect: regional ingress → app → valid Redis hit, otherwise primary replay barrier → caught-up replica lookup with bounded primary fallback → check state and expiry → 302 + no-store through ingress. Cache validity starts before the lookup and ends within 30 seconds, capped by link expiry. There is no browser/CDN redirect cache; analytics remains optional."}</Paragraph>
      <Paragraph>{"Edits/deletion: authorize owner and version → commit new state plus invalidation outbox → advance the cache version floor and invalidate. The freshness limit bounds stale decisions even if invalidation is delayed. Primary outages may stop redirects; that is part of the selected contract."}</Paragraph>
    </StepSection>
    <StepSection title="Check the arithmetic">
      <Paragraph>{"100M mappings/month × 500 B = 50 GB/month. Five years is 6B mappings and 3 TB logical, plus hundreds of GB of index allowances per copy. A 10 GB cache does not hold 100M 500-byte values. At 20,000 redirects/s and 95% cache hits, plan for 1,000 mapping lookups/s, plus 1,000 primary freshness probes/s and replica replay checks. Fallbacks add primary mapping reads; retries and optional analytics add further work. None of these inputs is a measured capacity claim."}</Paragraph>
    </StepSection>
    <StepSection title="Interview follow-ups">
      <CardGrid><Card title="Change the analytics contract">If analytics becomes required, would you permit event loss to keep redirects available? Explain what the counters actually measure.</Card><Card title="Tighten takedown latency">What must become authoritative on every request if a 30-second stale decision window is unacceptable?</Card><Card title="Shard without duplicate creates">How does a retry find its code when the idempotency key and random code route to different shards?</Card><Card title="Recover the full history">Which acknowledged writes can be lost after all synchronous copies fail, and how do backups change the answer?</Card></CardGrid>
    </StepSection>
<Callout label="Self review">Trace cache hits, misses, dependency failure, expiry, and mutation invalidation separately. Name the authority, acknowledgement boundary, and customer-visible failure for each.</Callout>
  </StepContent>
);
