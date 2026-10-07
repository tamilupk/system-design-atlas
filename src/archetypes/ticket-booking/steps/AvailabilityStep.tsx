import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export function AvailabilityStep() {
 return (<StepContent>
<Callout label="The decision">{"A green seat turns unavailable after a click. That can be an honest product experience. Showing a purchased seat as reserved for two people cannot."}</Callout>
<StepSection title="Separate static geometry from changing state"><Paragraph>{"Cache venue geometry and public event descriptions at the CDN with versioned URLs. Dynamic availability snapshots contain seat status and version only. The browser displays freshness and revalidates periodically; every hold goes to the authoritative inventory writer. Private booking/status responses use no-store and require authorization."}</Paragraph></StepSection>
<StepSection title="Budget the read path"><Paragraph>{"From the launch envelope, 200,000 map requests/s × 20 KB = 4 GB/s to viewers. An illustrative 99% CDN hit ratio leaves 2,000 origin requests/s; this is a target to test, not a guaranteed cache property. A server-side snapshot cache can reduce database reads further. Cold starts and many distinct event keys can invalidate that assumption."}</Paragraph></StepSection>
<StepSection title="Invalidation still races"><Paragraph>{"Build monotonically versioned snapshots from committed changes. A delayed snapshot must not overwrite a newer version. Origin invalidation does not purge already cached browser responses; a short TTL bounds ordinary staleness but does not ensure instantaneous revocation. Coalesce rebuilds and serve explicitly stale maps during cache trouble; do not fail open for reservations."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"We trade map freshness for read capacity while keeping ownership decisions authoritative. Origin analytics miss browser-cache hits unless separate client telemetry is collected."}</Callout>
<StepSection title="Defend the design"><Paragraph>{"Would you pay for per-seat WebSocket updates? Estimate recipient fan-out before replacing polling."}</Paragraph></StepSection>
</StepContent>);
}
