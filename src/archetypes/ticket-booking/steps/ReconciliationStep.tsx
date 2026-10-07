import { StepContent, StepSection, Paragraph, Callout } from '@/components/lesson/StepComponents';

export function ReconciliationStep() {
 return (<StepContent>
<Callout label="The decision">{"The worker sent the payment, crashed, and never saved the response. The provider callback is delayed. “Retry with a new key” is how one unknown charge becomes two."}</Callout>
<StepSection title="Three recovery channels"><Paragraph>{"Retry the same operation within the provider’s supported idempotency window; query its known payment object; and process authenticated webhooks. Persist the provider object ID as soon as available. If the request outcome remains unknown beyond provider deduplication retention, investigate by merchant reference or settlement records instead of blindly charging again."}</Paragraph></StepSection>
<StepSection title="Receive before acknowledging"><Paragraph>{"Verify the webhook signature against the raw body and enforce replay/timestamp checks appropriate to the provider. Persist a unique provider event ID in an inbox before acknowledging. A worker applies state transitions transactionally; duplicates become no-ops. An older failure event cannot undo a confirmed booking. Fetch current provider state when event ordering is ambiguous."}</Paragraph></StepSection>
<StepSection title="Reconcile money, bookings, and issuance"><Paragraph>{"Periodically scan overdue payment states and compare provider records against the local ledger. Detect charged-but-unconfirmed, confirmed-without-verified-charge, and duplicate charges. Emit refund or investigation obligations with stable IDs. Delivery of an issued ticket may retry; unique (booking_id, seat_id) makes issuance logically once despite repeated work."}</Paragraph></StepSection>
<StepSection title="Retention is part of correctness"><Paragraph>{"Retain financial operation identity through the full settlement/refund reconciliation period. An illustrative 24-hour HTTP replay window is not a reason to delete payment history. Provider retention limits and refund capabilities must be verified for the chosen integration."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"Outbox and inbox make work recoverable. They do not make a remote financial effect exactly once; durable identity and reconciliation close the remaining gaps."}</Callout>
<StepSection title="Defend the design"><Paragraph>{"The webhook endpoint returns 200 and crashes before persisting the event. Which recovery channel saves you?"}</Paragraph></StepSection>
<Paragraph>Source: <a href="https://docs.stripe.com/webhooks" target="_blank" rel="noreferrer">Stripe webhook delivery and signature guidance</a>. The scenario and architecture are illustrative.</Paragraph>
<Paragraph>Provider retry contract: <a href="https://docs.stripe.com/api/idempotent_requests" target="_blank" rel="noreferrer">Stripe idempotent requests</a>. Verify the retention window for your integration.</Paragraph>
</StepContent>);
}
