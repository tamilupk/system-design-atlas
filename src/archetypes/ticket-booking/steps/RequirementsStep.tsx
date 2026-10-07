import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export function RequirementsStep() {
 return (<StepContent>
<Callout label="The decision">{"It is 09:59. A concert has 50,000 assigned seats. One million fans are about to arrive. Two people select the same pair. Which response are you willing to make irreversible?"}</Callout>
<StepSection title="Define the promises"><Paragraph>{"Within one event, a seat has at most one live owner. A group of up to four seats is held all-or-nothing. Confirmation requires both durable seat ownership and verified successful payment. A seat map may be stale; a successful hold may not be imaginary. A queue position is permission to try, not a promise of inventory."}</Paragraph></StepSection>
<StepSection title="Illustrative launch envelope"><Paragraph>{"Assume 1,000,000 visitors arrive over 600 seconds: 1,667 arrivals/s on average. A 5× burst is 8,333 arrivals/s. If all remain and refresh every 5 seconds, that is 200,000 map requests/s. At 20 KB per response, outbound payload is 4 GB/s before protocol overhead. These are planning assumptions, not observed traffic."}</Paragraph></StepSection>
<StepSection title="Inventory bounds the funnel"><Paragraph>{"Assume a 2-seat average order: 50,000 ÷ 2 = at most 25,000 successful orders. If all seats spend 300 seconds held before release, saturated inventory can recycle only 50,000 ÷ (2 × 300) ≈ 83 hold groups/s. This is a no-conversion steady-state bound, not database throughput or launch admission capacity."}</Paragraph></StepSection>
<StepSection title="Capacity and service objectives"><Paragraph>{"For 100 active events, 50,000 seats/event × 200 bytes/projected seat = 1 GB logical seat-map working set before allocator overhead and replicas. Proposed targets: hold-decision p99 under 500 ms after admission; 99.9% monthly mutation availability, or 30 × 24 × 60 × 0.001 = 43.2 minutes of error budget. Measure these; correctness takes priority during uncertain ownership."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"We start with assigned seating, one event per order, fixed quoted prices, and a five-minute hold. Resale, cross-event atomic baskets, and offline venue admission are separate products."}</Callout>
<StepSection title="Defend the design"><Paragraph>{"If marketing demands “everyone gets a fair chance,” does that mean FIFO arrival, a pre-sale lottery, or equal purchase limits?"}</Paragraph></StepSection>
</StepContent>);
}
