import type { ArchetypeModule } from '@/types/archetype';
import { urlShortenerMetadata } from './metadata';
import { urlShortenerLesson } from './lesson';
import { urlShortenerDiagrams } from './diagrams';
import { urlShortenerConceptContext } from './concept-context';
import { urlShortenerChallenges } from './challenges';
import { stepComponents } from './steps';

const urlShortenerModule: ArchetypeModule = {
  metadata: urlShortenerMetadata,
  lesson: urlShortenerLesson,
  diagrams: urlShortenerDiagrams,
  conceptContext: urlShortenerConceptContext,
  stepComponents,
  challenges: urlShortenerChallenges,
};

export default urlShortenerModule;
