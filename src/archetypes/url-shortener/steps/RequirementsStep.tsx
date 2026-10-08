import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export const RequirementsStep: FC<StepComponentProps> = () => (
  <StepContent>
    <StepSection title="Define the product promise">
      <Paragraph>{"A link goes viral just as its owner changes the destination. Can we keep redirects fast and honor the edit? Decide which promises must survive caching before drawing Redis."}</Paragraph>
      <Paragraph>{"Our baseline supports creation, case-sensitive custom aliases, scheduled expiry, and authenticated destination edits and deletion. Codes are public identifiers, not access credentials; sensitive destinations enforce their own authorization."}</Paragraph>
      <Paragraph>{"Per-link analytics is an optional extension discussed in the trade-offs step, outside the core redirect architecture. The baseline does not promise complete click counts or unique-visitor tracking."}</Paragraph>
    </StepSection>
    <StepSection title="One illustrative traffic envelope">
      <Paragraph>{"Use a 30-day planning month: 100M creations ÷ 2,592,000 seconds ≈ 38.6/s, rounded to 40/s; a 5× peak is about 200/s. 1B redirects ÷ 2,592,000 ≈ 386/s, rounded to 400/s. Explore 25×–50× read bursts of 10,000–20,000/s. These are workload inputs, not benchmark results."}</Paragraph>
      <Paragraph>{"With no browser or CDN redirect caching, redirect requests reach the service. A 95% Redis hit ratio would reduce 20,000 lookups/s to 1,000 mapping lookups/s. In the scaled design, each miss also requires a primary WAL-position probe and a replica replay check; primary fallbacks add work. The hit ratio is a hypothesis to test, especially with short freshness windows and older links."}</Paragraph>
    </StepSection>
    <StepSection title="Working set, storage, and indexes">
      <Paragraph>{"Budget 500 bytes per logical mapping including a representative destination and metadata. 100M × 500 B = 50 GB/month, 600 GB/year, and 3 TB for 6B rows over five years. Longer URLs change this average. Five years is an illustrative retention choice, not a requirement to retain personal data indefinitely."}</Paragraph>
      <Paragraph>{"A proposed 10 GB cache fits at most 20M 500-byte payloads before keys, object overhead, fragmentation, replication buffers, and replicas. That is capacity, not expected residency. With the later 30-second validity limit, even 20,000 distinct redirect misses/s produce at most 600,000 live entries (300 MB payload); at 95% hits, 1,000 fills/s × 30s is at most 30,000 entries (15 MB), excluding optional create warmups. Measure burst shape and reuse before provisioning 10 GB. An 80/20 popularity assumption alone establishes neither residency nor hit ratio."}</Paragraph>
      <Paragraph>{"Illustrative index allowances at 6B rows: 64 B/short-code entry gives 384 GB; 32 B/numeric primary-key entry gives 192 GB. Together with 3 TB of rows that is 3.576 TB per copy, or 10.728 TB for three copies, before bloat, WAL, backups, idempotency records, and analytics. Measure actual index sizes and cache locality. Read replicas add copies; they do not make primary storage or restores free."}</Paragraph>
    </StepSection>
    <StepSection title="Service objectives have a boundary">
      <Paragraph>{"Proposed targets: healthy cache-hit redirect p99 below 100 ms measured from regional ingress to response, excluding public Internet RTT; 99.99% monthly redirect availability gives 30 × 24 × 60 × 0.0001 = 4.32 minutes of error budget. Neither target is a measured result or a global Internet RTT promise."}</Paragraph>
      <Paragraph>{"Use explicit request budgets rather than invented component benchmarks: illustrative redirect budgets are 20 ms for Redis, 200 ms for the complete database lookup, and a 300 ms overall request deadline. Creation has a separately measured budget for reputation checks and synchronous commit. A timeout budget is not a p99; measure cache-hit and miss distributions separately. The reliability step states the durability and outage compromises."}</Paragraph>
    </StepSection>
<Callout label="Defend the assumptions">What changes if takedowns must be instantaneous, or analytics must record every redirect? Both add work to the redirect critical path.</Callout>
  </StepContent>
);
