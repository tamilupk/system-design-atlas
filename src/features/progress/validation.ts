import {
  CURRENT_SCHEMA_VERSION,
  LEGACY_CHALLENGE_ARCHETYPE_ID,
  type ChallengeProgress,
  type ChallengeProgressMap,
  type ChallengesByArchetype,
  type ProgressState,
  type DecisionJournalEntry,
} from './types';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isValidTimestamp(val: unknown): boolean {
  if (val === null) return true;
  if (typeof val !== 'string') return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function isUnsafeKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor';
}

function isValidChallengeProgress(val: unknown): boolean {
  if (!isObject(val)) return false;
  if (typeof val.challengeId !== 'string') return false;
  if (!isValidTimestamp(val.attemptedAt)) return false;
  if (!isValidTimestamp(val.completedAt)) return false;
  if (val.selectedOptionId !== null && typeof val.selectedOptionId !== 'string') return false;
  if (typeof val.demonstratedUnderstanding !== 'boolean') return false;
  if (val.notesDraft !== undefined && typeof val.notesDraft !== 'string') return false;
  return true;
}

/** Validates the flat `Record<challengeId, ChallengeProgress>` used by schema versions 1 and 2. */
function validateFlatChallenges(data: unknown): string | null {
  if (data === undefined) return null;
  if (!isObject(data)) return 'Invalid challenges';

  for (const [challengeId, progress] of Object.entries(data)) {
    if (isUnsafeKey(challengeId)) return 'Prototype pollution attempt in challenges';
    if (!isValidChallengeProgress(progress)) return `Invalid challenge progress for ${challengeId}`;
  }
  return null;
}

/** Validates the namespaced `Record<archetypeId, Record<challengeId, ChallengeProgress>>` used by schema version 3. */
function validateNamespacedChallenges(data: unknown): string | null {
  if (data === undefined) return null;
  if (!isObject(data)) return 'Invalid challenges';

  for (const [archetypeId, byChallenge] of Object.entries(data)) {
    if (isUnsafeKey(archetypeId)) return 'Prototype pollution attempt in challenges';
    if (!isObject(byChallenge)) return `Invalid challenge progress for archetype ${archetypeId}`;
    for (const [challengeId, progress] of Object.entries(byChallenge)) {
      if (isUnsafeKey(challengeId)) return 'Prototype pollution attempt in challenges';
      if (!isValidChallengeProgress(progress)) return `Invalid challenge progress for ${archetypeId}/${challengeId}`;
    }
  }
  return null;
}

/** Rebuilds a namespaced challenge map, dropping anything that did not validate. */
function normalizeNamespacedChallenges(data: unknown): ChallengesByArchetype {
  if (!isObject(data)) return {};

  const result: ChallengesByArchetype = {};
  for (const [archetypeId, byChallenge] of Object.entries(data)) {
    if (isUnsafeKey(archetypeId) || !isObject(byChallenge)) continue;
    const chapterMap: ChallengeProgressMap = {};
    for (const [challengeId, progress] of Object.entries(byChallenge)) {
      if (isUnsafeKey(challengeId) || !isValidChallengeProgress(progress)) continue;
      chapterMap[challengeId] = progress as ChallengeProgress;
    }
    result[archetypeId] = chapterMap;
  }
  return result;
}

/**
 * Migrates the flat challenge map of schema versions 1 and 2 into the
 * namespaced shape. Only URL Shortener shipped challenges before namespacing,
 * so every legacy entry is attributed to that chapter.
 */
function migrateFlatChallenges(data: unknown): ChallengesByArchetype {
  if (!isObject(data)) return {};

  const chapterMap: ChallengeProgressMap = {};
  for (const [challengeId, progress] of Object.entries(data)) {
    if (isUnsafeKey(challengeId) || !isValidChallengeProgress(progress)) continue;
    chapterMap[challengeId] = progress as ChallengeProgress;
  }
  if (Object.keys(chapterMap).length === 0) return {};
  return { [LEGACY_CHALLENGE_ARCHETYPE_ID]: chapterMap };
}

function isDecisionJournalEntry(value: unknown): value is DecisionJournalEntry {
  if (!isObject(value)) return false;
  return ['id', 'stepId', 'title', 'decision', 'rationale', 'consequences'].every(key => typeof value[key] === 'string')
    && typeof value.timestamp === 'string' && isValidTimestamp(value.timestamp);
}

export function validateProgressState(data: unknown): { valid: true; state: ProgressState } | { valid: false; error: string } {
  if (!isObject(data)) return { valid: false, error: 'Data is not an object' };

  if (data.app !== 'system-design-atlas') return { valid: false, error: 'Invalid app identifier' };
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== 3) {
    return { valid: false, error: 'Unsupported schema version' };
  }

  if (Object.hasOwn(data, 'exportedAt') && data.exportedAt !== undefined && !isValidTimestamp(data.exportedAt)) {
    return { valid: false, error: 'Invalid exportedAt timestamp' };
  }

  if (!isObject(data.preferences)) return { valid: false, error: 'Invalid preferences' };
  const prefs = data.preferences;
  if (prefs.chatProvider !== 'chatgpt' && prefs.chatProvider !== 'claude' && prefs.chatProvider !== 'gemini') {
    return { valid: false, error: 'Invalid chat provider' };
  }
  if (typeof prefs.focusMode !== 'boolean') return { valid: false, error: 'Invalid focusMode' };

  if (data.lastVisited !== null) {
    if (!isObject(data.lastVisited)) return { valid: false, error: 'Invalid lastVisited' };
    if (typeof data.lastVisited.archetypeId !== 'string' || typeof data.lastVisited.stepId !== 'string' || !isValidTimestamp(data.lastVisited.visitedAt)) {
      return { valid: false, error: 'Invalid lastVisited fields' };
    }
  }

  if (!isObject(data.archetypes)) return { valid: false, error: 'Invalid archetypes' };
  
  for (const [archId, archData] of Object.entries(data.archetypes)) {
    if (archId === '__proto__' || archId === 'constructor') return { valid: false, error: 'Prototype pollution attempt' };
    if (!isObject(archData)) return { valid: false, error: `Invalid archetype data for ${archId}` };
    if (typeof archData.lastStepId !== 'string') return { valid: false, error: `Invalid lastStepId for ${archId}` };
    if (!isValidTimestamp(archData.updatedAt)) return { valid: false, error: `Invalid updatedAt for ${archId}` };
    if (!isObject(archData.steps)) return { valid: false, error: `Invalid steps for ${archId}` };

    for (const [stepId, stepData] of Object.entries(archData.steps)) {
       if (stepId === '__proto__' || stepId === 'constructor') return { valid: false, error: 'Prototype pollution attempt in steps' };
       if (!isObject(stepData)) return { valid: false, error: `Invalid step data for ${archId}/${stepId}` };
       if (!isValidTimestamp(stepData.visitedAt) || !isValidTimestamp(stepData.completedAt)) {
         return { valid: false, error: `Invalid timestamps for ${archId}/${stepId}` };
       }
    }
  }

  if (data.notes !== undefined) {
    if (!isObject(data.notes)) return { valid: false, error: 'Invalid notes format' };
    if (data.notes.archetypes !== undefined) {
      if (!isObject(data.notes.archetypes)) return { valid: false, error: 'Invalid archetype notes' };
      for (const [key, val] of Object.entries(data.notes.archetypes)) {
        if (key === '__proto__' || key === 'constructor') return { valid: false, error: 'Prototype pollution attempt in notes' };
        if (typeof val !== 'string') return { valid: false, error: `Invalid note for archetype ${key}` };
      }
    }
    if (data.notes.steps !== undefined) {
      if (!isObject(data.notes.steps)) return { valid: false, error: 'Invalid step notes' };
      for (const [archKey, stepsObj] of Object.entries(data.notes.steps)) {
        if (archKey === '__proto__' || archKey === 'constructor') return { valid: false, error: 'Prototype pollution attempt in step notes' };
        if (!isObject(stepsObj)) return { valid: false, error: `Invalid step notes for archetype ${archKey}` };
        for (const [stepKey, val] of Object.entries(stepsObj)) {
          if (stepKey === '__proto__' || stepKey === 'constructor') return { valid: false, error: 'Prototype pollution attempt in step notes' };
          if (typeof val !== 'string') return { valid: false, error: `Invalid note for step ${archKey}/${stepKey}` };
        }
      }
    }
  }

  // Challenge progress is namespaced by archetype from schema version 3 onward;
  // versions 1 and 2 stored it in a single flat map.
  const challengeError = data.schemaVersion === CURRENT_SCHEMA_VERSION
    ? validateNamespacedChallenges(data.challenges)
    : validateFlatChallenges(data.challenges);
  if (challengeError) return { valid: false, error: challengeError };

  // Schema migration & normalization to the current version
  const migratedState: ProgressState = {
    ...(data as unknown as ProgressState),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    challenges: data.schemaVersion === CURRENT_SCHEMA_VERSION
      ? normalizeNamespacedChallenges(data.challenges)
      : migrateFlatChallenges(data.challenges),
    decisionJournal: Array.isArray(data.decisionJournal) ? data.decisionJournal.filter(isDecisionJournalEntry) : [],
    notes: isObject(data.notes) ? {
      archetypes: isObject(data.notes.archetypes) ? (data.notes.archetypes as Record<string, string>) : {},
      steps: isObject(data.notes.steps) ? (data.notes.steps as Record<string, Record<string, string>>) : {},
    } : { archetypes: {}, steps: {} },
  };

  return { valid: true, state: migratedState };
}
