export interface StepProgress {
  readonly visitedAt: string | null;
  readonly completedAt: string | null;
}

export interface ChallengeProgress {
  readonly challengeId: string;
  readonly attemptedAt: string;
  readonly completedAt: string | null;
  readonly selectedOptionId: string | null;
  readonly demonstratedUnderstanding: boolean;
  readonly notesDraft?: string;
}

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
  readonly schemaVersion: 1 | 2;
  readonly exportedAt?: string;
  readonly preferences: Preferences;
  readonly lastVisited: LastVisited | null;
  readonly archetypes: Record<string, ArchetypeProgress>;
  readonly challenges?: Record<string, ChallengeProgress>;
  readonly decisionJournal?: readonly DecisionJournalEntry[];
  readonly notes?: UserNotes;
}

export type ProgressAction =
  | { type: 'VISIT_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'COMPLETE_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'UNCOMPLETE_STEP'; archetypeId: string; stepId: string }
  | { type: 'SAVE_CHALLENGE_ATTEMPT'; challengeId: string; selectedOptionId: string; demonstratedUnderstanding: boolean; notesDraft?: string; timestamp: string }
  | { type: 'SAVE_DECISION_ENTRY'; entry: DecisionJournalEntry }
  | { type: 'SET_ARCHETYPE_NOTE'; archetypeId: string; note: string }
  | { type: 'SET_STEP_NOTE'; archetypeId: string; stepId: string; note: string }
  | { type: 'SET_CHAT_PROVIDER'; provider: ChatProvider }
  | { type: 'SET_FOCUS_MODE'; enabled: boolean }
  | { type: 'REPLACE_STATE'; state: ProgressState }
  | { type: 'MERGE_STATE'; imported: ProgressState }
  | { type: 'RESET' };
