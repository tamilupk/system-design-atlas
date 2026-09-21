import type { LessonDefinition, StepComponentMap } from './lesson';
import type { ConceptContext } from './concept';
import type { DiagramDefinition } from './diagram';

export type LearningStage =
  | 'foundation'
  | 'advanced'
  | 'genai';

export type ChapterAvailability = 'available' | 'planned';

export interface ArchetypeMetadata {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly stage: LearningStage;
  readonly sequence: number;
  readonly availability: ChapterAvailability;
  readonly estimatedMinutes?: number;
  readonly tags: readonly string[];
}

export interface ArchetypeModule {
  readonly metadata: ArchetypeMetadata;
  readonly lesson: LessonDefinition;
  readonly diagrams: DiagramDefinition;
  readonly conceptContext: ConceptContext;
  readonly stepComponents: StepComponentMap;
}

export type ArchetypeLazyLoader = () => Promise<ArchetypeModule>;
