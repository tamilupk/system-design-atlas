import { StepContent, StepSection, Paragraph, Callout, DecisionChallenge } from '@/components/lesson/StepComponents';
import { ticketBookingChallenges } from '../challenges';

export function AdmissionStep() {
 return (<StepContent>
<Callout label="The decision">{"The database is healthy at a controlled rate and collapses when everyone retries. A waiting room must protect useful work, not simply move an unbounded queue into application memory."}</Callout>
<StepSection title="Control attempts, not just arrivals"><Paragraph>{"Assume a load test finds a sustainable 600 hold attempts/s under realistic seat skew and payment/release work. At a 60% operating target, admit at most 360 attempts/s before additional failure reserve. This is a hypothetical benchmark input. Against an 8,333 arrivals/s burst, a one-attempt-per-arrival approximation leaves 7,973/s waiting or rejected. Browsing users may attempt repeatedly, so enforce per-session mutation budgets too."}</Paragraph></StepSection>
<StepSection title="Tokens and fairness"><Paragraph>{"Use a signed, short-lived token bound to event, authenticated principal, and nonce. Validate it on every hold request; track replay and per-account limits server-side. Pre-sale arrivals can use a published lottery, followed by FIFO for later arrivals. State which queue policy applies and what happens on refresh or reconnect. Purchase limits and bot defenses help but do not prove one account equals one human."}</Paragraph></StepSection>
<StepSection title="Capacity feedback and outages"><Paragraph>{"Reduce admission on lock-wait growth, database saturation, and payment backlog; cap both rate and in-flight work. Preserve a budget for status reads, expiry, callbacks, and reconciliation. Expired tokens return users to a documented policy. If admission state is unavailable, pause new holds rather than bypassing the gate. Redundant ingress distributes traffic; it does not arbitrate seats."}</Paragraph></StepSection>
<StepSection title="Queue arithmetic has limits"><Paragraph>{"For a bounded queue of 100,000 users at 360 users/s and one attempt each, a no-new-arrivals drain estimate is 278 seconds. Real wait time changes with retries, token expiry, conversion, and sellout. Stop promising queue ETAs when inventory is exhausted."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"Admission spends scarce downstream capacity deliberately. A fast rejection is preferable to a timeout that invites duplicate work."}</Callout>
<DecisionChallenge challenge={ticketBookingChallenges["overload"]!} />
<StepSection title="Defend the design"><Paragraph>{"The payment provider slows down while hold latency is fine. Which signal should close the gate?"}</Paragraph></StepSection>
</StepContent>);
}
