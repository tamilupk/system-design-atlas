import { StepContent, StepSection, Paragraph, Callout, DecisionChallenge } from '@/components/lesson/StepComponents';
import { ticketBookingChallenges } from '../challenges';

export function RegionalFailureStep() {
 return (<StepContent>
<Callout label="The decision">{"Region A acknowledged the last two seats and then disappeared. Region B is behind. Promoting B immediately may make those same seats available again."}</Callout>
<StepSection title="State the failure model"><Paragraph>{"Use one writable authority per event and synchronously durable copies across selected availability zones. Acknowledge only at the configured durability boundary. Fencing must prevent an isolated old primary from accepting writes after promotion. Synchronous replication trades latency and availability for a stronger acknowledged-write guarantee within those failure assumptions."}</Paragraph></StepSection>
<StepSection title="Regional history can be uncertain"><Paragraph>{"An asynchronous remote replica may lack acknowledged holds or sales. RPO is how much data can be lost; RTO is time to restore service. Neither is made zero by drawing a replica. We choose to freeze mutations for affected events until the committed history and ownership can be established. Keep browsing clearly stale and show payment/booking status as temporarily unavailable when it cannot be proven."}</Paragraph></StepSection>
<StepSection title="A safe failover runbook"><Paragraph>{"Stop admission, fence the old writer through storage/cluster authority, verify the candidate’s committed position, restore authoritative history if needed, promote and update the event directory, reconcile payment operations, then reopen gradually. If history cannot be recovered, quarantine affected inventory and use financial/issuance records plus human remediation; do not claim automatic zero-loss recovery."}</Paragraph></StepSection>
<StepSection title="If the business requires continued selling"><Paragraph>{"Evaluate a cross-region consensus-backed store with its quorum and latency trade-offs, or preallocate disjoint inventory ownership to regions. Disjoint quotas reduce utilization and make group seating harder. Neither option permits two regions to own the same assigned seat during a partition."}</Paragraph></StepSection>
<Callout label="Our choice and its cost">{"For this design, unavailable is preferable to selling an already acknowledged seat again. This can consume the earlier availability error budget."}</Callout>
<DecisionChallenge challenge={ticketBookingChallenges["regional-safety"]!} />
<StepSection title="Defend the design"><Paragraph>{"Can a payment record reconstruct an uncharged but acknowledged hold? What does that imply for recovery?"}</Paragraph></StepSection>
<Paragraph>Source: <a href="https://www.postgresql.org/docs/current/warm-standby.html" target="_blank" rel="noreferrer">PostgreSQL synchronous and asynchronous standby trade-offs</a>. The scenario and architecture are illustrative.</Paragraph>
</StepContent>);
}
