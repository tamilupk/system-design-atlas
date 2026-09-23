import { describe, expect, it } from 'vitest';
import { initialState } from '@/features/progress/reducer';
import { validateProgressState } from '@/features/progress/validation';
import { getChapterProgress, getResumeInfo, isStepCompleted } from '@/features/progress/selectors';
import { chatStepManifest } from '../steps-manifest';
import { chatLesson } from '../lesson';

// Historical IDs deliberately remain fixed: this is a compatibility fixture.
const originalIds = ['requirements', 'api-data', 'baseline', 'ordering', 'reconnect', 'scaling', 'resilience', 'tradeoffs', 'recap'];
const timestamp = '2026-09-23T12:00:00Z';

describe('chat trajectory expansion', () => {
  it('preserves a pre-expansion save while leaving new lessons incomplete', () => {
    const oldSave = {
      ...initialState,
      lastVisited: { archetypeId: 'chat', stepId: 'resilience', visitedAt: timestamp },
      archetypes: { chat: { lastStepId: 'resilience', updatedAt: timestamp,
        steps: Object.fromEntries(originalIds.map(id => [id, { visitedAt: timestamp, completedAt: timestamp }])),
      } },
      notes: { archetypes: { chat: 'Review regional guarantees' }, steps: { chat: { reconnect: 'Use a contiguous cursor' } } },
      challenges: { chat: { 'partition-owner': {
        challengeId: 'partition-owner', attemptedAt: timestamp, completedAt: timestamp,
        selectedOptionId: 'freeze-fence', demonstratedUnderstanding: true,
      } } },
    };
    const result = validateProgressState(JSON.parse(JSON.stringify(oldSave)));
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error(result.error);
    const ids = chatStepManifest.map(step => step.id);
    expect(ids).toEqual(expect.arrayContaining(originalIds));
    expect(getChapterProgress(result.state, 'chat', ids)).toEqual({ visited: 9, completed: 9, total: 12, percentage: 75 });
    for (const id of ['presence-receipts', 'hot-room-fanout', 'operations']) {
      expect(isStepCompleted(result.state, 'chat', id)).toBe(false);
    }
    expect(result.state.notes).toEqual(oldSave.notes);
    expect(result.state.challenges).toEqual(oldSave.challenges);
    expect(getResumeInfo(result.state)).toEqual({ archetypeId: 'chat', stepId: 'resilience' });
    expect(chatLesson.contentVersion).toBeGreaterThanOrEqual(2);
  });
});
