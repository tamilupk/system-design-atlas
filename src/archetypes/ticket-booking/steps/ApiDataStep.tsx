import { StepContent, StepSection, Paragraph, Callout, CodeBlock } from '@/components/lesson/StepComponents';

export function ApiDataStep() {
 return (<StepContent>
<Callout label="The decision">{"A mobile client sends a hold request, loses the response, and retries through another server. A random request ID per retry creates a second operation; a stable operation ID lets us discover the first."}</Callout>
<StepSection title="API contract"><Paragraph>{"POST /events/{event}/holds carries seat IDs, quote version, and an Idempotency-Key. Authenticate the principal and enforce purchase limits in the same authority boundary as holds. Return 201 only after commit, 409 for unavailable seats or conflicting key payload, and 429 for admission limits. GET /events/{event}/bookings/{id} is authenticated and reads authoritative state after mutations. A timeout means unknown, not rejected."}</Paragraph></StepSection>
<StepSection title="Keys and ownership"><Paragraph>{"Inventory uses (event_id, seat_id) as its primary key, with state, hold_id, and generation. Holds contain principal_id, expiry, seat list, and quote. Bookings contain payment operation ID and lifecycle state. Unique (event_id, principal_id, operation, key) binds a retry to a canonical request hash and result. Keep all of these rows on the event shard."}</Paragraph></StepSection>
<StepSection title="Bounded replay and privacy"><Paragraph>{"Illustrative API retry window: 24 hours. Store issued operation timestamps and reject expired keys; retain booking/payment identity longer for reconciliation. Provider key retention is a separate contract. Opaque IDs do not authorize reads: check ownership on every request. Do not put names, tokens, or payment details in map snapshots or logs."}</Paragraph></StepSection>
<CodeBlock code={"inventory PRIMARY KEY (event_id, seat_id)\nhold PRIMARY KEY (event_id, hold_id)\nbooking UNIQUE (event_id, hold_id)\nrequest UNIQUE (event_id, principal_id, operation, key)\noutbox UNIQUE (event_id, operation_id)\ninbox UNIQUE (provider, provider_event_id)"} language="text" />
<Callout label="Our choice and its cost">{"The request key identifies an operation, the hold ID identifies a reservation, and the payment operation ID identifies one financial attempt. Reusing one indiscriminately hides bugs."}</Callout>
<StepSection title="Defend the design"><Paragraph>{"What happens if the same key arrives concurrently with two different seat lists?"}</Paragraph></StepSection>
</StepContent>);
}
