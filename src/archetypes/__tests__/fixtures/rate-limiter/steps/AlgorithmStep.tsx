import React from 'react';
import type { StepComponentProps } from '@/types/lesson';
import { 
  StepContent, 
  StepSection, 
  Paragraph,
  ConceptLink,
  Callout, 
  TradeoffTable, 
  DecisionChallenge,
  CodeBlock,
  CardGrid,
  Card 
} from '@/components/lesson/StepComponents';
import { rateLimiterChallenges } from '../challenges';

export const AlgorithmStep: React.FC<StepComponentProps> = ({ onConceptClick }) => {
  return (
    <StepContent>
      <StepSection title="Token Bucket vs Sliding Window Log">
        <Paragraph>
          At scale, choosing the right rate limiting algorithm dictates memory consumption, accuracy, and operational complexity.
        </Paragraph>
        <Paragraph>
          Both families keep their counters in a{' '}
          <ConceptLink conceptId="cache" onConceptClick={onConceptClick}>cache</ConceptLink>{' '}
          tier so that gateways stay stateless.
        </Paragraph>
      </StepSection>

      <Callout label="Senior Engineering Insight" variant="insight">
        Sliding Window Log requires O(N) memory per user where N is request count, creating an unbounded RAM vulnerability during traffic bursts. In contrast, Token Bucket stores O(1) state per user; actual bytes depend on encoding, key size, allocator, and datastore overhead.
      </Callout>

      <TradeoffTable
        title="Algorithm Comparison Matrix"
        items={[
          {
            aspect: 'Token Bucket',
            pros: 'O(1) state per user; allows traffic bursts up to bucket capacity; CPU-efficient.',
            cons: 'Two parameters to tune (burst capacity and refill rate).',
          },
          {
            aspect: 'Sliding Window Log',
            pros: 'Tracks requests in a rolling window; precision depends on timestamp resolution and atomic updates.',
            cons: 'O(N) memory; requires Redis ZREMRANGEBYSCORE on every request.',
          },
        ]}
      />

      <StepSection title="Atomic Redis Lua Implementation">
        <Paragraph>Illustrative single-key algorithm. Validate positive capacity and refill rate, use a consistent clock, and define failover behavior before production use.</Paragraph>
        <CodeBlock
          title="token_bucket.lua"
          language="lua"
          code={`local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1]) or capacity
local last_updated = tonumber(data[2]) or now

local delta = math.max(0, now - last_updated)
tokens = math.min(capacity, tokens + delta * refill_rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call("HMSET", key, "tokens", tokens, "last_updated", now)
  redis.call("EXPIRE", key, math.max(1, math.ceil(capacity / refill_rate)))
  return 1
else
  return 0
end`}
        />
      </StepSection>

      {/* Render Decision Challenge widget */}
      <DecisionChallenge challenge={rateLimiterChallenges['storage-strategy']!} />

      <StepSection title="Senior Interview Follow-up Probes">
        <CardGrid>
          <Card title="How to mitigate Redis failover latency?">
            Implement a client-side circuit breaker. If Redis p99 exceeds 5ms, trip the circuit to a local token bucket with relaxed limits.
          </Card>
          <Card title="What if an attacker spoofs X-Forwarded-For?">
            Accept forwarding headers only from trusted proxies that sanitize them; resolve the client using the configured trusted proxy chain. Prefer authenticated tenant or API identities for quotas.
          </Card>
        </CardGrid>
      </StepSection>
    </StepContent>
  );
};
