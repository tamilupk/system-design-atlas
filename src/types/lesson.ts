import type { ComponentType } from 'react';

export interface LessonStep {
  readonly id: string;
  readonly title: string;
  readonly shortTitle?: string;
  readonly objective: string;
  readonly diagramStateId?: string;
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

export interface StepComponentProps {
  readonly step: LessonStep;
  readonly onConceptClick: (conceptId: string) => void;
}

export type StepComponentMap = Record<string, ComponentType<StepComponentProps>>;
