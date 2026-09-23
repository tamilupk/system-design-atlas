import type { ArchetypeModule } from '@/types/archetype';
import { chatMetadata } from './metadata';
import { chatLesson } from './lesson';
import { chatDiagrams } from './diagrams';
import { chatConceptContext } from './concept-context';
import { chatChallenges } from './challenges';
import { stepComponents } from './steps';

const chatModule: ArchetypeModule = {
  metadata: chatMetadata, lesson: chatLesson, diagrams: chatDiagrams,
  conceptContext: chatConceptContext, challenges: chatChallenges, stepComponents,
};
export default chatModule;
