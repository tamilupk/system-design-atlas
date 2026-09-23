export interface StepProgress {
  readonly visitedAt: string | null;
  readonly completedAt: string | null;
}

/** Schema version written by the current build. Older versions are migrated up to it. */
export const CURRENT_SCHEMA_VERSION = 3 as const;

/**
 * Schema versions 1 and 2 stored challenge progress in a single flat map keyed
 * only by challenge ID. URL Shortener was the only chapter that shipped
 * challenges, so its progress is attributed to that chapter on migration.
 */
export const LEGACY_CHALLENGE_ARCHETYPE_ID = 'url-shortener';

export interface ChallengeProgress {
  readonly challengeId: string;
  readonly attemptedAt: string;
  readonly completedAt: string | null;
  readonly selectedOptionId: string | null;
  readonly demonstratedUnderstanding: boolean;
  readonly notesDraft?: string;
}

/**
 * Challenge progress for one chapter, keyed by that chapter's own challenge IDs.
 *
 * Challenge IDs are only unique *within* a chapter, so two chapters may both
 * define `storage-strategy`. Nesting by archetype ID keeps their attempts,
 * completion, and understanding state independent.
 */
export type ChallengeProgressMap = Record<string, ChallengeProgress>;

/** Challenge progress keyed by archetype ID, then by challenge ID. */
export type ChallengesByArchetype = Record<string, ChallengeProgressMap>;

export interface DecisionJournalEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly stepId: string;
  readonly title: string;
  readonly decision: string;
  readonly rationale: string;
  readonly consequences: string;
}

export interface ArchetypeProgress {
  readonly lastStepId: string;
  readonly updatedAt: string;
  readonly steps: Record<string, StepProgress>;
}

export interface LastVisited {
  readonly archetypeId: string;
  readonly stepId: string;
  readonly visitedAt: string;
}

export interface Preferences {
  readonly chatProvider: ChatProvider;
  readonly focusMode: boolean;
}

export type ChatProvider = 'chatgpt' | 'claude' | 'gemini';

export interface UserNotes {
  readonly archetypes: Record<string, string>;
  readonly steps: Record<string, Record<string, string>>;
}

export interface ProgressState {
  readonly app: 'system-design-atlas';
  readonly schemaVersion: 1 | 2 | 3;
  readonly exportedAt?: string;
  readonly preferences: Preferences;
  readonly lastVisited: LastVisited | null;
  readonly archetypes: Record<string, ArchetypeProgress>;
  readonly challenges?: ChallengesByArchetype;
  readonly decisionJournal?: readonly DecisionJournalEntry[];
  readonly notes?: UserNotes;
}

export type ProgressAction =
  | { type: 'VISIT_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'COMPLETE_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'UNCOMPLETE_STEP'; archetypeId: string; stepId: string }
  | { type: 'SAVE_CHALLENGE_ATTEMPT'; archetypeId: string; challengeId: string; selectedOptionId: string; demonstratedUnderstanding: boolean; notesDraft?: string; timestamp: string }
  | { type: 'SAVE_DECISION_ENTRY'; entry: DecisionJournalEntry }
  | { type: 'SET_ARCHETYPE_NOTE'; archetypeId: string; note: string }
  | { type: 'SET_STEP_NOTE'; archetypeId: string; stepId: string; note: string }
  | { type: 'SET_CHAT_PROVIDER'; provider: ChatProvider }
  | { type: 'SET_FOCUS_MODE'; enabled: boolean }
  | { type: 'REPLACE_STATE'; state: ProgressState }
  | { type: 'MERGE_STATE'; imported: ProgressState }
  | { type: 'RESET' };
