import { useContext, useCallback } from 'react';
import { ProgressContext } from '../features/progress/ProgressProvider';
import { ChatProvider } from '../features/progress/types';

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }

  const { state, dispatch, storageAvailable } = context;

  const visitStep = useCallback((archetypeId: string, stepId: string) => {
    dispatch({ type: 'VISIT_STEP', archetypeId, stepId, timestamp: new Date().toISOString() });
  }, [dispatch]);

  const completeStep = useCallback((archetypeId: string, stepId: string) => {
    dispatch({ type: 'COMPLETE_STEP', archetypeId, stepId, timestamp: new Date().toISOString() });
  }, [dispatch]);

  const uncompleteStep = useCallback((archetypeId: string, stepId: string) => {
    dispatch({ type: 'UNCOMPLETE_STEP', archetypeId, stepId });
  }, [dispatch]);

  const setChatProvider = useCallback((provider: ChatProvider) => {
    dispatch({ type: 'SET_CHAT_PROVIDER', provider });
  }, [dispatch]);

  const setFocusMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_FOCUS_MODE', enabled });
  }, [dispatch]);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const saveChallengeAttempt = useCallback((
    archetypeId: string,
    challengeId: string,
    selectedOptionId: string,
    demonstratedUnderstanding: boolean,
    notesDraft?: string
  ) => {
    dispatch({
      type: 'SAVE_CHALLENGE_ATTEMPT',
      archetypeId,
      challengeId,
      selectedOptionId,
      demonstratedUnderstanding,
      notesDraft,
      timestamp: new Date().toISOString(),
    });
  }, [dispatch]);

  const setArchetypeNote = useCallback((archetypeId: string, note: string) => {
    dispatch({ type: 'SET_ARCHETYPE_NOTE', archetypeId, note });
  }, [dispatch]);

  const setStepNote = useCallback((archetypeId: string, stepId: string, note: string) => {
    dispatch({ type: 'SET_STEP_NOTE', archetypeId, stepId, note });
  }, [dispatch]);

  const getArchetypeNote = useCallback((archetypeId: string): string => {
    return state.notes?.archetypes?.[archetypeId] || '';
  }, [state.notes]);

  const getStepNote = useCallback((archetypeId: string, stepId: string): string => {
    return state.notes?.steps?.[archetypeId]?.[stepId] || '';
  }, [state.notes]);

  return {
    state,
    dispatch,
    storageAvailable,
    visitStep,
    completeStep,
    uncompleteStep,
    setChatProvider,
    setFocusMode,
    resetProgress,
    saveChallengeAttempt,
    setArchetypeNote,
    setStepNote,
    getArchetypeNote,
    getStepNote,
  };
}
