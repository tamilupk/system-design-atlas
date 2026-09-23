import { ProgressState } from './types';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isValidTimestamp(val: unknown): boolean {
  if (val === null) return true;
  if (typeof val !== 'string') return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export function validateProgressState(data: unknown): { valid: true; state: ProgressState } | { valid: false; error: string } {
  if (!isObject(data)) return { valid: false, error: 'Data is not an object' };

  if (data.app !== 'system-design-atlas') return { valid: false, error: 'Invalid app identifier' };
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2) {
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

  // Schema migration & normalization to version 2
  const migratedState: ProgressState = {
    ...(data as unknown as ProgressState),
    schemaVersion: 2,
    challenges: isObject(data.challenges) ? (data.challenges as any) : {},
    decisionJournal: Array.isArray(data.decisionJournal) ? (data.decisionJournal as any) : [],
    notes: isObject(data.notes) ? {
      archetypes: isObject(data.notes.archetypes) ? (data.notes.archetypes as Record<string, string>) : {},
      steps: isObject(data.notes.steps) ? (data.notes.steps as Record<string, Record<string, string>>) : {},
    } : { archetypes: {}, steps: {} },
  };

  return { valid: true, state: migratedState };
}
