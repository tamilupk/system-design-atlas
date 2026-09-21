import type { ArchetypeModule } from '@/types/archetype';
import { urlShortenerMetadata } from './metadata';
import { urlShortenerLesson } from './lesson';
import { urlShortenerDiagrams } from './diagrams';
import { urlShortenerConceptContext } from './concept-context';
import { stepComponents } from './steps';

const urlShortenerModule: ArchetypeModule = {
  metadata: urlShortenerMetadata,
  lesson: urlShortenerLesson,
  diagrams: urlShortenerDiagrams,
  conceptContext: urlShortenerConceptContext,
  stepComponents,
};

export default urlShortenerModule;
