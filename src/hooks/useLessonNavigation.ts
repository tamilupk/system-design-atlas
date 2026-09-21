import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LessonDefinition } from '@/types/lesson';

export function useLessonNavigation(archetypeId: string, lesson: LessonDefinition, currentStepId: string) {
  const navigate = useNavigate();
  const steps = lesson.steps;
  
  const currentIndex = useMemo(
    () => steps.findIndex(s => s.id === currentStepId),
    [steps, currentStepId]
  );
  
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < steps.length - 1;
  
  const goToStep = useCallback((stepId: string) => {
    navigate(`/archetypes/${archetypeId}/steps/${stepId}`);
  }, [navigate, archetypeId]);
  
  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      const prevStep = steps[currentIndex - 1];
      if (prevStep) goToStep(prevStep.id);
    }
  }, [hasPrevious, steps, currentIndex, goToStep]);
  
  const goToNext = useCallback(() => {
    if (hasNext) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) goToStep(nextStep.id);
    }
  }, [hasNext, steps, currentIndex, goToStep]);
  
  return {
    currentIndex,
    hasPrevious,
    hasNext,
    goToStep,
    goToPrevious,
    goToNext,
    totalSteps: steps.length,
  };
}
