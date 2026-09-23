import type { ArchetypeModule } from '@/types/archetype';
import { rateLimiterMetadata } from './metadata';
import { rateLimiterLesson } from './lesson';
import { rateLimiterDiagrams } from './diagrams';
import { rateLimiterConceptContext } from './concept-context';
import { rateLimiterChallenges } from './challenges';
import { stepComponents } from './steps';

const rateLimiterModule: ArchetypeModule = {
  metadata: rateLimiterMetadata,
  lesson: rateLimiterLesson,
  diagrams: rateLimiterDiagrams,
  conceptContext: rateLimiterConceptContext,
  stepComponents,
  challenges: rateLimiterChallenges,
};

export default rateLimiterModule;
