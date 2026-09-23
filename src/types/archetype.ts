import type { LessonDefinition, StepComponentMap } from './lesson';
import type { ConceptContext } from './concept';
import type { DiagramDefinition } from './diagram';
import type { ChallengeMap } from './challenge';

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
  /**
   * Decision challenges authored for this chapter. Optional: a chapter may ship
   * without challenges. When present, `validateArchetypeModule` checks that every
   * entry is well-formed and that its key matches `ChallengeDefinition.id`.
   */
  readonly challenges?: ChallengeMap;
}

export type ArchetypeLazyLoader = () => Promise<ArchetypeModule>;
