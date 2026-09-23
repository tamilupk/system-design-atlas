import { CURRENT_SCHEMA_VERSION, ProgressState, ProgressAction, type ChallengeProgress } from './types';

export const initialState: ProgressState = {
  app: 'system-design-atlas',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  preferences: {
    chatProvider: 'chatgpt',
    focusMode: false,
  },
  lastVisited: null,
  archetypes: {},
  challenges: {},
  decisionJournal: [],
  notes: {
    archetypes: {},
    steps: {},
  },
};

/**
 * Combines two records of the same challenge. Attempts are never lost:
 * earliest attempt wins, understanding and completion are sticky, and the
 * first non-empty notes draft is kept.
 */
function mergeChallengeProgress(current: ChallengeProgress, imported: ChallengeProgress): ChallengeProgress {
  return {
    ...current,
    attemptedAt: new Date(imported.attemptedAt) < new Date(current.attemptedAt) ? imported.attemptedAt : current.attemptedAt,
    demonstratedUnderstanding: current.demonstratedUnderstanding || imported.demonstratedUnderstanding,
    completedAt: current.completedAt || imported.completedAt,
    notesDraft: current.notesDraft || imported.notesDraft,
  };
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'VISIT_STEP': {
      const { archetypeId, stepId, timestamp } = action;
      const prevArch = state.archetypes[archetypeId];
      const prevStep = prevArch?.steps[stepId] || { visitedAt: null, completedAt: null };

      return {
        ...state,
        lastVisited: { archetypeId, stepId, visitedAt: timestamp },
        archetypes: {
          ...state.archetypes,
          [archetypeId]: {
            ...(prevArch || {}),
            lastStepId: stepId,
            updatedAt: timestamp,
            steps: {
              ...(prevArch?.steps || {}),
              [stepId]: {
                ...prevStep,
                visitedAt: prevStep.visitedAt || timestamp,
              },
            },
          },
        },
      };
    }
    case 'COMPLETE_STEP': {
      const { archetypeId, stepId, timestamp } = action;
      const prevArch = state.archetypes[archetypeId];
      const prevStep = prevArch?.steps[stepId] || { visitedAt: timestamp, completedAt: null };

      return {
        ...state,
        archetypes: {
          ...state.archetypes,
          [archetypeId]: {
            lastStepId: prevArch?.lastStepId || stepId,
            ...(prevArch || {}),
            updatedAt: timestamp,
            steps: {
              ...(prevArch?.steps || {}),
              [stepId]: {
                visitedAt: prevStep.visitedAt || timestamp,
                completedAt: timestamp,
              },
            },
          },
        },
      };
    }
    case 'UNCOMPLETE_STEP': {
      const { archetypeId, stepId } = action;
      const prevArch = state.archetypes[archetypeId];
      if (!prevArch) return state;
      const prevStep = prevArch.steps[stepId];
      if (!prevStep) return state;

      return {
        ...state,
        archetypes: {
          ...state.archetypes,
          [archetypeId]: {
            ...prevArch,
            steps: {
              ...prevArch.steps,
              [stepId]: {
                ...prevStep,
                completedAt: null,
              },
            },
          },
        },
      };
    }
    case 'SET_CHAT_PROVIDER': {
      return {
        ...state,
        preferences: {
          ...state.preferences,
          chatProvider: action.provider,
        },
      };
    }
    case 'SET_FOCUS_MODE': {
      return {
        ...state,
        preferences: {
          ...state.preferences,
          focusMode: action.enabled,
        },
      };
    }
    case 'SAVE_CHALLENGE_ATTEMPT': {
      const { archetypeId, challengeId, selectedOptionId, demonstratedUnderstanding, notesDraft, timestamp } = action;
      const prev = state.challenges?.[archetypeId]?.[challengeId];
      return {
        ...state,
        challenges: {
          ...(state.challenges || {}),
          [archetypeId]: {
            ...(state.challenges?.[archetypeId] || {}),
            [challengeId]: {
              challengeId,
              attemptedAt: prev?.attemptedAt || timestamp,
              completedAt: demonstratedUnderstanding ? timestamp : (prev?.completedAt || null),
              selectedOptionId,
              demonstratedUnderstanding: prev?.demonstratedUnderstanding || demonstratedUnderstanding,
              notesDraft: notesDraft !== undefined ? notesDraft : prev?.notesDraft,
            },
          },
        },
      };
    }
    case 'SAVE_DECISION_ENTRY': {
      const { entry } = action;
      const currentJournal = state.decisionJournal || [];
      const exists = currentJournal.some(e => e.id === entry.id);
      return {
        ...state,
        decisionJournal: exists
          ? currentJournal.map(e => (e.id === entry.id ? entry : e))
          : [...currentJournal, entry],
      };
    }
    case 'SET_ARCHETYPE_NOTE': {
      const { archetypeId, note } = action;
      return {
        ...state,
        notes: {
          archetypes: {
            ...(state.notes?.archetypes || {}),
            [archetypeId]: note,
          },
          steps: state.notes?.steps || {},
        },
      };
    }
    case 'SET_STEP_NOTE': {
      const { archetypeId, stepId, note } = action;
      const prevArchSteps = state.notes?.steps?.[archetypeId] || {};
      return {
        ...state,
        notes: {
          archetypes: state.notes?.archetypes || {},
          steps: {
            ...(state.notes?.steps || {}),
            [archetypeId]: {
              ...prevArchSteps,
              [stepId]: note,
            },
          },
        },
      };
    }
    case 'REPLACE_STATE': {
      return action.state;
    }
    case 'MERGE_STATE': {
      const { imported } = action;
      const mergedArchetypes = { ...state.archetypes };

      for (const [archId, importedArch] of Object.entries(imported.archetypes)) {
        if (!mergedArchetypes[archId]) {
          mergedArchetypes[archId] = importedArch;
        } else {
          const currentArch = mergedArchetypes[archId];
          const mergedSteps = { ...currentArch.steps };

          for (const [stepId, importedStep] of Object.entries(importedArch.steps)) {
            const currentStep = mergedSteps[stepId];
            if (!currentStep) {
              mergedSteps[stepId] = importedStep;
            } else {
              let newCompletedAt = currentStep.completedAt;
              if (importedStep.completedAt) {
                if (!currentStep.completedAt || new Date(importedStep.completedAt) < new Date(currentStep.completedAt)) {
                  newCompletedAt = importedStep.completedAt;
                }
              }

              let newVisitedAt = currentStep.visitedAt;
              if (importedStep.visitedAt) {
                if (!currentStep.visitedAt || new Date(importedStep.visitedAt) < new Date(currentStep.visitedAt)) {
                  newVisitedAt = importedStep.visitedAt;
                }
              }

              mergedSteps[stepId] = {
                visitedAt: newVisitedAt,
                completedAt: newCompletedAt,
              };
            }
          }

          let newUpdatedAt = currentArch.updatedAt;
          let newLastStepId = currentArch.lastStepId;
          
          if (new Date(importedArch.updatedAt) > new Date(currentArch.updatedAt)) {
             newUpdatedAt = importedArch.updatedAt;
             newLastStepId = importedArch.lastStepId;
          }

          mergedArchetypes[archId] = {
            ...currentArch,
            updatedAt: newUpdatedAt,
            lastStepId: newLastStepId,
            steps: mergedSteps,
          };
        }
      }

      let newLastVisited = state.lastVisited;
      if (imported.lastVisited) {
        if (!state.lastVisited || new Date(imported.lastVisited.visitedAt) > new Date(state.lastVisited.visitedAt)) {
          newLastVisited = imported.lastVisited;
        }
      }

      // Merge challenges, namespaced per archetype so identically-named
      // challenges in different chapters never overwrite each other.
      const mergedChallenges = { ...(state.challenges || {}) };
      if (imported.challenges) {
        for (const [archId, importedChapter] of Object.entries(imported.challenges)) {
          const currentChapter = { ...(mergedChallenges[archId] || {}) };
          for (const [cId, impChallenge] of Object.entries(importedChapter)) {
            const cur = currentChapter[cId];
            currentChapter[cId] = cur ? mergeChallengeProgress(cur, impChallenge) : impChallenge;
          }
          mergedChallenges[archId] = currentChapter;
        }
      }

      // Merge decision journal
      const existingIds = new Set((state.decisionJournal || []).map(e => e.id));
      const mergedJournal = [...(state.decisionJournal || [])];
      if (imported.decisionJournal) {
        for (const entry of imported.decisionJournal) {
          if (!existingIds.has(entry.id)) {
            mergedJournal.push(entry);
            existingIds.add(entry.id);
          }
        }
      }

      // Merge user notes
      const mergedNotes = {
        archetypes: { ...(state.notes?.archetypes || {}) },
        steps: { ...(state.notes?.steps || {}) },
      };
      if (imported.notes) {
        if (imported.notes.archetypes) {
          for (const [archId, note] of Object.entries(imported.notes.archetypes)) {
            if (!mergedNotes.archetypes[archId] || mergedNotes.archetypes[archId].trim() === '') {
              mergedNotes.archetypes[archId] = note;
            } else if (note && note !== mergedNotes.archetypes[archId]) {
              mergedNotes.archetypes[archId] = `${mergedNotes.archetypes[archId]}\n\n---\n\n${note}`;
            }
          }
        }
        if (imported.notes.steps) {
          for (const [archId, stepNotes] of Object.entries(imported.notes.steps)) {
            const currentStepNotes = { ...(mergedNotes.steps[archId] || {}) };
            for (const [stepId, note] of Object.entries(stepNotes)) {
              if (!currentStepNotes[stepId] || currentStepNotes[stepId].trim() === '') {
                currentStepNotes[stepId] = note;
              } else if (note && note !== currentStepNotes[stepId]) {
                currentStepNotes[stepId] = `${currentStepNotes[stepId]}\n\n---\n\n${note}`;
              }
            }
            mergedNotes.steps[archId] = currentStepNotes;
          }
        }
      }

      return {
        ...state,
        lastVisited: newLastVisited,
        archetypes: mergedArchetypes,
        challenges: mergedChallenges,
        decisionJournal: mergedJournal,
        notes: mergedNotes,
      };
    }
    case 'RESET': {
      return initialState;
    }
    default:
      return state;
  }
}
