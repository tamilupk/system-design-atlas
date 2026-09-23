import type { LessonDefinition } from '@/types/lesson';

export const rateLimiterLesson: LessonDefinition = {
  archetypeId: 'rate-limiter',
  title: 'Distributed Rate Limiter',
  contentVersion: 1,
  steps: [{
    id: 'algorithm',
    title: 'Rate Limiting Algorithms',
    shortTitle: 'Algorithms',
    objective: 'Compare rate limiting algorithms and their distributed state trade-offs.',
    diagramStateId: 'scaled',
    highlightedNodes: ['redis'],
    flowSequenceId: 'throttled-flow',
    concepts: ['cache', 'load-balancer'],
  }],
};
