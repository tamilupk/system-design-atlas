import { useEffect, type FC, type ComponentType } from 'react';
import styles from './LessonPlayer.module.css';
import type { LessonStep, StepComponentProps } from '@/types/lesson';

interface LessonPlayerProps {
  step: LessonStep;
  stepComponent: ComponentType<StepComponentProps>;
  stepIndex: number;
  totalSteps: number;
  onConceptClick: (conceptId: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const LessonPlayer: FC<LessonPlayerProps> = ({
  step,
  stepComponent: StepComponent,
  stepIndex,
  totalSteps,
  onConceptClick,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious?.();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, onPrevious, onNext]);

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <div className={styles.stepMeta}>Step {stepIndex + 1} of {totalSteps}</div>
        <h1 className={styles.title}>{step.title}</h1>
        {step.objective && (
          <p className={styles.objective}>{step.objective}</p>
        )}
      </header>

      <div className={styles.content}>
        <StepComponent 
          step={step}
          onConceptClick={onConceptClick}
        />
      </div>
    </div>
  );
};
