export interface StepProgress {
  readonly visitedAt: string | null;
  readonly completedAt: string | null;
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

export interface ProgressState {
  readonly app: 'system-design-atlas';
  readonly schemaVersion: 1;
  readonly exportedAt?: string;
  readonly preferences: Preferences;
  readonly lastVisited: LastVisited | null;
  readonly archetypes: Record<string, ArchetypeProgress>;
}

export type ProgressAction =
  | { type: 'VISIT_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'COMPLETE_STEP'; archetypeId: string; stepId: string; timestamp: string }
  | { type: 'UNCOMPLETE_STEP'; archetypeId: string; stepId: string }
  | { type: 'SET_CHAT_PROVIDER'; provider: ChatProvider }
  | { type: 'SET_FOCUS_MODE'; enabled: boolean }
  | { type: 'REPLACE_STATE'; state: ProgressState }
  | { type: 'MERGE_STATE'; imported: ProgressState }
  | { type: 'RESET' };
