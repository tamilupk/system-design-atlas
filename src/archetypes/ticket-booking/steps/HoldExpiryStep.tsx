import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export function HoldExpiryStep() {
 return (<StepContent>
<Callout label="The decision">{"At 10:05:00, a cleanup worker and checkout race on the same hold. The browser countdown reaches zero. Which actor decides whether those seats can be sold again?"}</Callout>
<StepSection title="One serialization protocol"><Paragraph>{"For operations on an existing hold, lock the hold row first, then its seats in sorted order. Use this same order for expiry, checkout, cancellation, and confirmation. Sample authoritative database time after acquiring the hold lock. Checkout may change HELD to PAYMENT_PENDING only if that sampled time precedes expires_at. The expiry worker can release only HELD holds whose deadline has passed."}</Paragraph></StepSection>
<StepSection title="Expiry is eligibility, not a broadcast"><Paragraph>{"At or after expiry, checkout cannot begin. Seats become AVAILABLE only when a release transaction commits; a late sweeper reduces utilization rather than causing overselling. New hold creation claims only AVAILABLE seats and never steals an expired row directly. Index (state, expires_at, hold_id) and scan bounded batches. A crashed sweeper is safe to retry."}</Paragraph></StepSection>
<StepSection title="Fence stale work"><Paragraph>{"Release each seat only if its hold_id and generation still match. Clear ownership and advance generation atomically. A delayed release for generation 7 must not clear generation 8. Browser clocks are display hints. Database clock jumps can shorten or extend the effective user window, so monitor clock health and pause admission during large discontinuities."}</Paragraph></StepSection>
<StepSection title="A separate payment deadline"><Paragraph>{"PAYMENT_PENDING is not released by the ordinary hold sweeper. Payment has its own recovery deadline and explicit closure protocol in the next pages. This sacrifices temporary inventory utilization to avoid silently reselling seats whose payment is unresolved."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"The winner is the transaction that locks and makes a valid transition first. The advertised countdown is approximate; server state determines acceptance."}</Callout>
<StepSection title="Defend the design"><Paragraph>{"Checkout waited behind the expiry transaction. Can an old transaction-start timestamp still authorize it? Explain why time is sampled after lock acquisition."}</Paragraph></StepSection>
</StepContent>);
}
