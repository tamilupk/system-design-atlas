import { StepContent, StepSection, Paragraph, Callout, DecisionChallenge } from '@/components/lesson/StepComponents';
import { ticketBookingChallenges } from '../challenges';

export function SeatContentionStep() {
 return (<StepContent>
<Callout label="The decision">{"Ten thousand buyers want row A. Adding ten thousand application threads makes the database queue longer; it does not create ten thousand copies of row A."}</Callout>
<StepSection title="Two valid mechanisms"><Paragraph>{"Pessimistic row locks serialize contenders before checking state. Optimistic conditional updates compare state or version and require exactly the expected row count, rolling back the entire group on any mismatch. Both can enforce exclusivity in the authoritative database. Optimistic retries are attractive at low collision rates; concentrated conflict makes wasted work significant."}</Paragraph></StepSection>
<StepSection title="A concrete interleaving"><Paragraph>{"Buyer A locks seats 11 and 12. Buyer B waits for seat 11. A commits HELD. B acquires the lock, sees HELD, and returns conflict rather than applying its earlier seat-map read. If A aborts instead, B can acquire both. A fixed lock order reduces deadlocks; bounded waits and whole-transaction retry still matter."}</Paragraph></StepSection>
<StepSection title="Why an external lease is insufficient"><Paragraph>{"If a Redis lease expires while an old worker pauses, a new worker can acquire it and both can later write. A lease can reduce load, but storage must enforce ownership/version checks. Adding a lock service adds another failure boundary without removing database arbitration. For this scenario, start with row locks and cap the waiting queue."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"One seat is inherently serialized. Scale independent seats and events, reject stale attempts quickly, and avoid retries that amplify the hot row."}</Callout>
<DecisionChallenge challenge={ticketBookingChallenges["seat-race"]!} />
<StepSection title="Defend the design"><Paragraph>{"When would optimistic updates be cheaper than locking, and which measurements would change your choice?"}</Paragraph></StepSection>
</StepContent>);
}
