import { ProgressState, ProgressAction } from './types';

export const initialState: ProgressState = {
  app: 'system-design-atlas',
  schemaVersion: 1,
  preferences: {
    chatProvider: 'chatgpt',
    focusMode: false,
  },
  lastVisited: null,
  archetypes: {},
};

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

      return {
        ...state,
        lastVisited: newLastVisited,
        archetypes: mergedArchetypes,
      };
    }
    case 'RESET': {
      return initialState;
    }
    default:
      return state;
  }
}
