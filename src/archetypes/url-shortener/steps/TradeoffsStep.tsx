import type { FC } from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { StepContent, StepSection, Paragraph, TradeoffTable, DecisionChallenge } from '@/components/lesson/StepComponents';
import { urlShortenerChallenges } from '../challenges';

export const TradeoffsStep: FC<StepComponentProps> = () => (
  <StepContent>
    <StepSection title="Redirect semantics and the selected policy">
      <TradeoffTable title="Redirect Status Codes and Cache Headers" items={[{aspect:"301 / 308 Permanent",pros:"Appropriate for permanent relocation; explicit cache policy remains possible.",cons:"Heuristic or explicit caching can bypass future origin checks. 308 preserves method; 301 may change POST to GET."},{aspect:"302 / 307 Temporary",pros:"Fits changeable destinations. 307 preserves method; 302 may change POST to GET.",cons:"Temporary status alone does not prevent caching. Our GET route selects 302 plus no-store."},{aspect:"Optional browser max-age",pros:"Avoids repeat network requests when stale destinations and missing analytics are acceptable.",cons:"An alternative product policy, not our baseline. Redis invalidation cannot purge a browser redirect."}]} />
      <Paragraph>{"We consistently choose 302 + no-store. This exposes subsequent requests to the service without claiming that every human action results in a request. Browser history, bots, previews, and direct visits to the destination still separate observed decisions from people."}</Paragraph>
    </StepSection>
    <StepSection title="Optional extension: click analytics">
      <Paragraph>Analytics is outside the core diagram. If added, observe valid GET requests on both cache-hit and cache-miss paths; a database-only counter would miss cache hits. Keep counters off the hot mapping row. A bounded asynchronous publisher preserves redirect availability but can lose observations on crashes or overflow, so reports must expose gaps.</Paragraph>
      <Paragraph>If the product instead requires durable recording before every redirect, it needs a separately designed ingestion and aggregation system, with acknowledgement, replay, deduplication, retention, and outage policies. That introduces latency and an availability dependency. Neither policy counts unique humans or proves the destination loaded; bots, previews, and retries remain distinct measurement questions.</Paragraph>
    </StepSection>
    <StepSection title="Abuse scanning and mutable destinations">
      <Paragraph>{"Application quota checks and synchronous destination reputation checks happen before activation or an edit commits. Unknown or timed-out safety checks do not publish a live destination. Do not create first and asynchronously scan without acknowledging the exposure window. Isolate any URL-fetching scanner to prevent SSRF; reputation services alone cannot prove a site harmless."}</Paragraph>
      <Paragraph>{"Already-approved destinations can later become malicious. Rechecking and reports can mark a mapping BLOCKED, increment its version, and emit invalidation through the same outbox. Our bounded cache policy still permits a short enforcement delay; if that is unacceptable, add an always-checked revocation service and accept its latency/availability dependency."}</Paragraph>
    </StepSection>
    <StepSection title="Defend the boundary">
      <Paragraph>{"A client receives a redirect but never loads the destination. A link is blocked while an old cache fill is in flight. Explain the distinct measurement and validity boundaries; no single status code solves both."}</Paragraph>
    </StepSection>
<DecisionChallenge challenge={urlShortenerChallenges['redirect-status-codes']!} />
<Paragraph>Source: <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-redirection-3xx" target="_blank" rel="noreferrer">RFC 9110 redirect semantics</a>.</Paragraph>
  </StepContent>
);
