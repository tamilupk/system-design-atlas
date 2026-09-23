import type { ComponentType } from 'react';

export interface LessonStep {
  readonly id: string;
  readonly title: string;
  readonly shortTitle?: string;
  readonly objective: string;
  readonly diagramStateId?: string;
  /**
   * Node IDs to draw attention to when this step is active.
   * Must reference nodes that exist in the step's resolved diagram state.
   */
  readonly highlightedNodes?: readonly string[];
  readonly flowSequenceId?: string;
  readonly concepts?: readonly string[];
}

export interface LessonDefinition {
  readonly archetypeId: string;
  readonly title: string;
  readonly contentVersion: number;
  readonly steps: readonly LessonStep[];
}

/**
 * The identity fields of a step, with no chapter content attached.
 *
 * A chapter's `steps-manifest.ts` declares these so that chapter-agnostic surfaces (the
 * home page, the curriculum list, the prerender script) can enumerate steps without
 * importing the lesson, its diagrams, or any step component. `validateStepManifest`
 * enforces that a manifest agrees with its lesson, so the two cannot drift.
 */
export type StepSummary = Pick<LessonStep, 'id' | 'title' | 'shortTitle'>;

export type ChapterStepManifest = readonly StepSummary[];

export interface StepComponentProps {
  readonly step: LessonStep;
  readonly onConceptClick: (conceptId: string) => void;
}

/**
 * Maps a stable step ID to the component that renders that step's explanation panel.
 * Keys must match `LessonDefinition.steps[].id` exactly; that agreement is enforced by
 * `validateArchetypeModule`, not by the type system.
 */
export type StepComponentMap = Readonly<Record<string, ComponentType<StepComponentProps>>>;
