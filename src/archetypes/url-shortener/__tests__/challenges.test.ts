import { describe, it, expect } from 'vitest';
import { urlShortenerChallenges } from '../challenges';

describe('URL Shortener Senior Decision Challenges', () => {
  const challengeKeys = [
    'id-generation-strategy',
    'cache-eviction-ttl',
    'replication-lag-race',
    'redirect-status-codes',
    'thundering-herd-mitigation',
    'rate-limiting-placement',
  ];

  it('contains all 6 required senior FAANG challenges', () => {
    expect(Object.keys(urlShortenerChallenges)).toEqual(expect.arrayContaining(challengeKeys));
    expect(Object.keys(urlShortenerChallenges).length).toBe(6);
  });

  challengeKeys.forEach(key => {
    describe(`Challenge: ${key}`, () => {
      const challenge = urlShortenerChallenges[key]!;

      it('has complete senior scenario and FAANG interview context', () => {
        expect(challenge.title.length).toBeGreaterThan(10);
        expect(challenge.scenario.length).toBeGreaterThan(40);
        expect(challenge.interviewContext.length).toBeGreaterThan(20);
        expect(challenge.options.length).toBeGreaterThanOrEqual(2);
      });

      it('has exactly one optimal strategy option', () => {
        const optimalOptions = challenge.options.filter(o => o.isOptimal);
        expect(optimalOptions.length).toBe(1);
      });

      it('provides detailed simulation metrics and senior rationale for every option', () => {
        challenge.options.forEach(opt => {
          expect(opt.title.length).toBeGreaterThan(5);
          expect(opt.description.length).toBeGreaterThan(10);
          expect(opt.simulationResult.metric.length).toBeGreaterThan(10);
          expect(opt.simulationResult.outcome.length).toBeGreaterThan(10);
          expect(opt.simulationResult.impact.length).toBeGreaterThan(10);
          expect(opt.seniorRationale.length).toBeGreaterThan(20);
          expect(opt.tradeOffSummary.length).toBeGreaterThan(10);
        });
      });
    });
  });
});
