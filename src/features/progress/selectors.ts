import { ProgressState } from './types';

export function getChapterProgress(state: ProgressState, archetypeId: string, stepIds: string[]) {
  const arch = state.archetypes[archetypeId];
  if (!arch) {
    return { visited: 0, completed: 0, total: stepIds.length, percentage: 0 };
  }

  let visited = 0;
  let completed = 0;
  
  for (const stepId of stepIds) {
    const step = arch.steps[stepId];
    if (step) {
      if (step.visitedAt) visited++;
      if (step.completedAt) completed++;
    }
  }

  const total = stepIds.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { visited, completed, total, percentage };
}

export function getLastVisitedStep(state: ProgressState, archetypeId: string): string | null {
  return state.archetypes[archetypeId]?.lastStepId || null;
}

export function isStepVisited(state: ProgressState, archetypeId: string, stepId: string): boolean {
  return !!state.archetypes[archetypeId]?.steps[stepId]?.visitedAt;
}

export function isStepCompleted(state: ProgressState, archetypeId: string, stepId: string): boolean {
  return !!state.archetypes[archetypeId]?.steps[stepId]?.completedAt;
}

/**
 * Saved progress for one challenge within one chapter. Challenge IDs are only
 * unique per chapter, so both keys are required.
 */
export function getChallengeProgress(state: ProgressState, archetypeId: string, challengeId: string) {
  return state.challenges?.[archetypeId]?.[challengeId] ?? null;
}

export function getOverallProgress(state: ProgressState, availableArchetypes: Record<string, string[]>) {
  let completedCount = 0;
  let inProgressCount = 0;
  const availableCount = Object.keys(availableArchetypes).length;

  for (const [archId, stepIds] of Object.entries(availableArchetypes)) {
    const arch = state.archetypes[archId];
    if (arch) {
      let isVisited = false;
      let allCompleted = true;
      if (stepIds.length === 0) allCompleted = false;

      for (const stepId of stepIds) {
        const step = arch.steps[stepId];
        if (!step) {
          allCompleted = false;
        } else {
          if (step.visitedAt) isVisited = true;
          if (!step.completedAt) allCompleted = false;
        }
      }

      if (allCompleted) {
        completedCount++;
      } else if (isVisited) {
        inProgressCount++;
      }
    }
  }

  return { availableCount, completedCount, inProgressCount };
}

export function getResumeInfo(state: ProgressState): { archetypeId: string; stepId: string } | null {
  if (state.lastVisited) {
    return { archetypeId: state.lastVisited.archetypeId, stepId: state.lastVisited.stepId };
  }
  return null;
}
