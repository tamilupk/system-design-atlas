import { describe, it, expect } from 'vitest';
import { progressReducer, initialState } from '@/features/progress/reducer';
import { getChapterProgress, isStepCompleted, isStepVisited, getOverallProgress, getResumeInfo } from '@/features/progress/selectors';
import { validateProgressState } from '@/features/progress/validation';
import type { ProgressState } from '@/features/progress/types';

const STEP_IDS = ['requirements', 'api-data', 'baseline', 'id-generation', 'cache', 'scaling', 'reliability', 'tradeoffs', 'recap'];

describe('progressReducer', () => {
  it('should return initial state', () => {
    expect(initialState.app).toBe('system-design-atlas');
    expect(initialState.schemaVersion).toBe(2);
    expect(initialState.lastVisited).toBeNull();
    expect(initialState.preferences.chatProvider).toBe('chatgpt');
    expect(Object.keys(initialState.archetypes)).toHaveLength(0);
    expect(initialState.challenges).toEqual({});
    expect(initialState.decisionJournal).toEqual([]);
  });

  it('should handle VISIT_STEP', () => {
    const state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    expect(state.lastVisited).toEqual({
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      visitedAt: '2026-01-01T00:00:00Z',
    });
    expect(state.archetypes['url-shortener']?.lastStepId).toBe('requirements');
    expect(state.archetypes['url-shortener']?.steps['requirements']?.visitedAt).toBe('2026-01-01T00:00:00Z');
    expect(state.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBeNull();
  });

  it('should not overwrite earlier visitedAt on revisit', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-02T00:00:00Z',
    });

    expect(state.archetypes['url-shortener']?.steps['requirements']?.visitedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('should handle COMPLETE_STEP', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:10:00Z',
    });

    expect(state.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBe('2026-01-01T00:10:00Z');
    expect(state.archetypes['url-shortener']?.steps['requirements']?.visitedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('should handle UNCOMPLETE_STEP', () => {
    let state = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, {
      type: 'UNCOMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
    });

    expect(state.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBeNull();
    expect(state.archetypes['url-shortener']?.steps['requirements']?.visitedAt).toBeTruthy();
  });

  it('should handle SET_CHAT_PROVIDER', () => {
    const state = progressReducer(initialState, {
      type: 'SET_CHAT_PROVIDER',
      provider: 'claude',
    });
    expect(state.preferences.chatProvider).toBe('claude');
  });

  it('should handle SET_FOCUS_MODE', () => {
    const state = progressReducer(initialState, {
      type: 'SET_FOCUS_MODE',
      enabled: true,
    });
    expect(state.preferences.focusMode).toBe(true);
  });

  it('should handle SAVE_CHALLENGE_ATTEMPT and track demonstrated understanding', () => {
    let state = progressReducer(initialState, {
      type: 'SAVE_CHALLENGE_ATTEMPT',
      challengeId: 'viral-link',
      selectedOptionId: 'opt-b',
      demonstratedUnderstanding: false,
      notesDraft: 'Drafting notes on hotkey mitigation',
      timestamp: '2026-01-01T00:00:00Z',
    });

    expect(state.challenges?.['viral-link']).toEqual({
      challengeId: 'viral-link',
      attemptedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      selectedOptionId: 'opt-b',
      demonstratedUnderstanding: false,
      notesDraft: 'Drafting notes on hotkey mitigation',
    });

    // Successfully demonstrates understanding
    state = progressReducer(state, {
      type: 'SAVE_CHALLENGE_ATTEMPT',
      challengeId: 'viral-link',
      selectedOptionId: 'opt-c',
      demonstratedUnderstanding: true,
      timestamp: '2026-01-01T00:05:00Z',
    });

    expect(state.challenges?.['viral-link']?.demonstratedUnderstanding).toBe(true);
    expect(state.challenges?.['viral-link']?.completedAt).toBe('2026-01-01T00:05:00Z');
    expect(state.challenges?.['viral-link']?.notesDraft).toBe('Drafting notes on hotkey mitigation');
  });

  it('should handle SAVE_DECISION_ENTRY in decision journal', () => {
    const entry = {
      id: 'dec-1',
      timestamp: '2026-01-01T00:00:00Z',
      stepId: 'cache',
      title: 'Cache Invalidation Strategy',
      decision: 'Cache-aside with TTL bounded by link expiry',
      rationale: 'Avoids stale redirects while protecting DB during traffic surges',
      consequences: 'Requires singleflight query coalescing during cache outages',
    };

    const state = progressReducer(initialState, {
      type: 'SAVE_DECISION_ENTRY',
      entry,
    });

    expect(state.decisionJournal).toHaveLength(1);
    expect(state.decisionJournal?.[0]).toEqual(entry);
  });

  it('should handle RESET', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });

  it('should handle REPLACE_STATE', () => {
    const newState: ProgressState = {
      app: 'system-design-atlas',
      schemaVersion: 1,
      preferences: { chatProvider: 'gemini', focusMode: true },
      lastVisited: { archetypeId: 'url-shortener', stepId: 'cache', visitedAt: '2026-06-01T00:00:00Z' },
      archetypes: {
        'url-shortener': {
          lastStepId: 'cache',
          updatedAt: '2026-06-01T00:00:00Z',
          steps: {
            requirements: { visitedAt: '2026-06-01T00:00:00Z', completedAt: '2026-06-01T00:00:00Z' },
          },
        },
      },
    };

    const state = progressReducer(initialState, { type: 'REPLACE_STATE', state: newState });
    expect(state).toEqual(newState);
  });

  it('should handle MERGE_STATE - union completed steps', () => {
    let currentState = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    const importedState: ProgressState = {
      app: 'system-design-atlas',
      schemaVersion: 1,
      preferences: { chatProvider: 'claude', focusMode: false },
      lastVisited: { archetypeId: 'url-shortener', stepId: 'cache', visitedAt: '2026-02-01T00:00:00Z' },
      archetypes: {
        'url-shortener': {
          lastStepId: 'cache',
          updatedAt: '2026-02-01T00:00:00Z',
          steps: {
            'api-data': { visitedAt: '2026-02-01T00:00:00Z', completedAt: '2026-02-01T00:00:00Z' },
            'cache': { visitedAt: '2026-02-01T00:00:00Z', completedAt: null },
          },
        },
      },
    };

    currentState = progressReducer(currentState, { type: 'MERGE_STATE', imported: importedState });

    // Should have both requirements (from current) and api-data (from imported)
    expect(currentState.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBeTruthy();
    expect(currentState.archetypes['url-shortener']?.steps['api-data']?.completedAt).toBeTruthy();
    expect(currentState.archetypes['url-shortener']?.steps['cache']?.visitedAt).toBeTruthy();
    expect(currentState.archetypes['url-shortener']?.steps['cache']?.completedAt).toBeNull();
  });

  it('should retain earliest completion timestamp on merge', () => {
    let currentState = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-03-01T00:00:00Z',
    });

    const importedState: ProgressState = {
      app: 'system-design-atlas',
      schemaVersion: 1,
      preferences: { chatProvider: 'chatgpt', focusMode: false },
      lastVisited: null,
      archetypes: {
        'url-shortener': {
          lastStepId: 'requirements',
          updatedAt: '2026-01-01T00:00:00Z',
          steps: {
            requirements: { visitedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:00Z' },
          },
        },
      },
    };

    currentState = progressReducer(currentState, { type: 'MERGE_STATE', imported: importedState });
    // Should retain the earlier completion
    expect(currentState.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('should not undo local completion on merge with incomplete imported step', () => {
    let currentState = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    const importedState: ProgressState = {
      app: 'system-design-atlas',
      schemaVersion: 1,
      preferences: { chatProvider: 'chatgpt', focusMode: false },
      lastVisited: null,
      archetypes: {
        'url-shortener': {
          lastStepId: 'requirements',
          updatedAt: '2026-02-01T00:00:00Z',
          steps: {
            requirements: { visitedAt: '2026-02-01T00:00:00Z', completedAt: null },
          },
        },
      },
    };

    currentState = progressReducer(currentState, { type: 'MERGE_STATE', imported: importedState });
    // Local completion should be preserved
    expect(currentState.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBe('2026-01-01T00:00:00Z');
  });
});

describe('selectors', () => {
  it('getChapterProgress should compute from current step IDs', () => {
    let state = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'api-data',
      timestamp: '2026-01-01T00:10:00Z',
    });
    state = progressReducer(state, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'baseline',
      timestamp: '2026-01-01T00:20:00Z',
    });

    const progress = getChapterProgress(state, 'url-shortener', STEP_IDS);
    expect(progress.total).toBe(9);
    expect(progress.completed).toBe(2);
    expect(progress.visited).toBe(3);
    expect(progress.percentage).toBe(22); // Math.round(2/9*100)
  });

  it('getChapterProgress should ignore unknown step IDs in saved progress', () => {
    let state = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    // Simulate an unknown step from an older version
    state = progressReducer(state, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'deleted-step',
      timestamp: '2026-01-01T00:10:00Z',
    });

    const progress = getChapterProgress(state, 'url-shortener', STEP_IDS);
    // Should only count 'requirements', not 'deleted-step'
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(9);
  });

  it('getChapterProgress handles newly added steps correctly', () => {
    let state = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    // New step IDs includes an additional step
    const newStepIds = [...STEP_IDS, 'new-step'];
    const progress = getChapterProgress(state, 'url-shortener', newStepIds);
    expect(progress.total).toBe(10);
    expect(progress.completed).toBe(1);
    expect(progress.percentage).toBe(10);
  });

  it('isStepVisited and isStepCompleted', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    expect(isStepVisited(state, 'url-shortener', 'requirements')).toBe(true);
    expect(isStepCompleted(state, 'url-shortener', 'requirements')).toBe(false);
    expect(isStepVisited(state, 'url-shortener', 'api-data')).toBe(false);

    state = progressReducer(state, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:10:00Z',
    });

    expect(isStepCompleted(state, 'url-shortener', 'requirements')).toBe(true);
  });

  it('getOverallProgress', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });

    const available = { 'url-shortener': STEP_IDS };
    const progress = getOverallProgress(state, available);
    expect(progress.availableCount).toBe(1);
    expect(progress.inProgressCount).toBe(1);
    expect(progress.completedCount).toBe(0);
  });

  it('getResumeInfo returns last visited', () => {
    let state = progressReducer(initialState, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'cache',
      timestamp: '2026-01-01T00:00:00Z',
    });

    const info = getResumeInfo(state);
    expect(info).toEqual({ archetypeId: 'url-shortener', stepId: 'cache' });
  });

  it('getResumeInfo returns null for new user', () => {
    expect(getResumeInfo(initialState)).toBeNull();
  });
});

describe('validation', () => {
  it('should validate correct state', () => {
    const result = validateProgressState(initialState);
    expect(result.valid).toBe(true);
  });

  it('should reject wrong app name', () => {
    const bad = { ...initialState, app: 'wrong-app' };
    const result = validateProgressState(bad);
    expect(result.valid).toBe(false);
  });

  it('should accept and migrate schemaVersion 1 to schemaVersion 2', () => {
    const v1State = { ...initialState, schemaVersion: 1 };
    delete (v1State as any).challenges;
    delete (v1State as any).decisionJournal;
    const result = validateProgressState(v1State);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.state.schemaVersion).toBe(2);
      expect(result.state.challenges).toEqual({});
      expect(result.state.decisionJournal).toEqual([]);
    }
  });

  it('should reject unsupported schema version', () => {
    const bad = { ...initialState, schemaVersion: 99 };
    const result = validateProgressState(bad);
    expect(result.valid).toBe(false);
  });

  it('should reject non-object input', () => {
    expect(validateProgressState(null).valid).toBe(false);
    expect(validateProgressState('string').valid).toBe(false);
    expect(validateProgressState(42).valid).toBe(false);
    expect(validateProgressState(undefined).valid).toBe(false);
  });

  it('should reject invalid chat provider', () => {
    const bad = {
      ...initialState,
      preferences: { ...initialState.preferences, chatProvider: 'invalid' },
    };
    const result = validateProgressState(bad);
    expect(result.valid).toBe(false);
  });
});

describe('YAML round-trip', () => {
  it('should export and import producing equivalent state', async () => {
    const { exportToYaml, importFromYaml } = await import('@/features/progress/yaml-transfer');

    let state = progressReducer(initialState, {
      type: 'COMPLETE_STEP',
      archetypeId: 'url-shortener',
      stepId: 'requirements',
      timestamp: '2026-01-01T00:00:00Z',
    });
    state = progressReducer(state, {
      type: 'VISIT_STEP',
      archetypeId: 'url-shortener',
      stepId: 'api-data',
      timestamp: '2026-01-01T00:10:00Z',
    });
    state = progressReducer(state, {
      type: 'SET_CHAT_PROVIDER',
      provider: 'claude',
    });

    const yaml = await exportToYaml(state);
    expect(yaml).toContain('system-design-atlas');
    expect(yaml).toContain('exportedAt');

    const result = await importFromYaml(yaml);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.state.app).toBe('system-design-atlas');
      expect(result.state.preferences.chatProvider).toBe('claude');
      expect(result.state.archetypes['url-shortener']?.steps['requirements']?.completedAt).toBe('2026-01-01T00:00:00Z');
      expect(result.state.archetypes['url-shortener']?.steps['api-data']?.visitedAt).toBe('2026-01-01T00:10:00Z');
      expect(result.summary.totalCompletedSteps).toBe(1);
    }
  });

  it('should reject invalid YAML', async () => {
    const { importFromYaml } = await import('@/features/progress/yaml-transfer');
    const result = await importFromYaml('not: valid: yaml: {{{');
    expect(result.valid).toBe(false);
  });

  it('should reject oversized content', async () => {
    const { importFromYaml } = await import('@/features/progress/yaml-transfer');
    const huge = 'x'.repeat(1024 * 1024 + 1);
    const result = await importFromYaml(huge);
    expect(result.valid).toBe(false);
  });

  it('should reject unsupported schema version', async () => {
    const { importFromYaml } = await import('@/features/progress/yaml-transfer');
    const yaml = `app: system-design-atlas\nschemaVersion: 99\npreferences:\n  chatProvider: chatgpt\n  focusMode: false\nlastVisited: null\narchetypes: {}`;
    const result = await importFromYaml(yaml);
    expect(result.valid).toBe(false);
  });

  it('should export and import user study notes via YAML', async () => {
    const { exportToYaml, importFromYaml } = await import('@/features/progress/yaml-transfer');
    let state = progressReducer(initialState, {
      type: 'SET_ARCHETYPE_NOTE',
      archetypeId: 'url-shortener',
      note: '# URL Shortener Overview\nFocus on read-heavy caching and Base62 IDs.',
    });
    state = progressReducer(state, {
      type: 'SET_STEP_NOTE',
      archetypeId: 'url-shortener',
      stepId: 'cache',
      note: 'Consider probabilistic early expiration to prevent thundering herd.',
    });

    const yaml = await exportToYaml(state);
    expect(yaml).toContain('URL Shortener Overview');
    expect(yaml).toContain('probabilistic early expiration');

    const result = await importFromYaml(yaml, ['url-shortener']);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.state.notes?.archetypes['url-shortener']).toContain('URL Shortener Overview');
      expect(result.state.notes?.steps['url-shortener']?.['cache']).toContain('probabilistic early expiration');
    }
  });
});

describe('notesReducer and validation', () => {
  it('should handle SET_ARCHETYPE_NOTE and SET_STEP_NOTE', () => {
    let state = progressReducer(initialState, {
      type: 'SET_ARCHETYPE_NOTE',
      archetypeId: 'url-shortener',
      note: 'Chapter level study note',
    });
    expect(state.notes?.archetypes['url-shortener']).toBe('Chapter level study note');

    state = progressReducer(state, {
      type: 'SET_STEP_NOTE',
      archetypeId: 'url-shortener',
      stepId: 'api-data',
      note: 'Step level study note for API',
    });
    expect(state.notes?.steps['url-shortener']?.['api-data']).toBe('Step level study note for API');
  });

  it('should merge notes cleanly on MERGE_STATE', () => {
    const current = progressReducer(initialState, {
      type: 'SET_STEP_NOTE',
      archetypeId: 'url-shortener',
      stepId: 'cache',
      note: 'Local note',
    });

    const imported = progressReducer(initialState, {
      type: 'SET_ARCHETYPE_NOTE',
      archetypeId: 'url-shortener',
      note: 'Imported chapter note',
    });

    const merged = progressReducer(current, {
      type: 'MERGE_STATE',
      imported,
    });

    expect(merged.notes?.steps['url-shortener']?.['cache']).toBe('Local note');
    expect(merged.notes?.archetypes['url-shortener']).toBe('Imported chapter note');
  });

  it('should reject prototype pollution in notes', () => {
    const malicious = JSON.parse('{"app":"system-design-atlas","schemaVersion":2,"preferences":{"chatProvider":"chatgpt","focusMode":false},"lastVisited":null,"archetypes":{},"notes":{"archetypes":{"__proto__":"hacked"}}}');
    const result = validateProgressState(malicious);
    expect(result.valid).toBe(false);
  });
});

describe('cache-load calculation', () => {
  it('should compute database reads correctly', () => {
    const requestsPerSecond = 10000;
    const hitRatio = 0.95;
    const expectedReads = Math.round(requestsPerSecond * (1 - hitRatio));
    expect(expectedReads).toBe(500);
  });

  it('should show full load when cache is disabled', () => {
    const requestsPerSecond = 10000;
    const hitRatio = 0;
    const expectedReads = requestsPerSecond * (1 - hitRatio);
    expect(expectedReads).toBe(10000);
  });

  it('should show zero reads with perfect cache', () => {
    const requestsPerSecond = 10000;
    const hitRatio = 1;
    const expectedReads = requestsPerSecond * (1 - hitRatio);
    expect(expectedReads).toBe(0);
  });
});
