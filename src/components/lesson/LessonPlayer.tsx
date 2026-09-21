import { useEffect, type FC, type ComponentType } from 'react';
import styles from './LessonPlayer.module.css';
import type { LessonStep, StepComponentProps } from '@/types/lesson';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface LessonPlayerProps {
  step: LessonStep;
  stepComponent: ComponentType<StepComponentProps>;
  stepIndex: number;
  totalSteps: number;
  isCompleted: boolean;
  onComplete: () => void;
  onUncomplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onConceptClick: (conceptId: string) => void;
  onAskAI: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const LessonPlayer: FC<LessonPlayerProps> = ({
  step,
  stepComponent: StepComponent,
  stepIndex,
  totalSteps,
  isCompleted,
  onComplete,
  onUncomplete,
  onPrevious,
  onNext,
  onConceptClick,
  onAskAI,
  hasPrevious,
  hasNext
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext();
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

      <footer className={styles.footer}>
        <div className={styles.navLeft}>
          <button 
            className={styles.navButton} 
            onClick={onPrevious} 
            disabled={!hasPrevious}
          >
            <ChevronLeft size={20} /> Previous
          </button>
        </div>
        
        <div className={styles.navCenter}>
          {isCompleted ? (
            <button className={styles.completeButtonAlt} onClick={onUncomplete}>
              Mark Incomplete
            </button>
          ) : (
            <button className={styles.completeButton} onClick={() => {
              onComplete();
              if (hasNext) onNext();
            }}>
              Complete & Next
            </button>
          )}
        </div>
        
        <div className={styles.navRight}>
          <button className={styles.aiButton} onClick={onAskAI}>
            <Sparkles size={18} /> Ask AI
          </button>
          <button 
            className={styles.navButton} 
            onClick={onNext} 
            disabled={!hasNext}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};
