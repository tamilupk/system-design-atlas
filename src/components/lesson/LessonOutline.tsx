import React from 'react';
import styles from './LessonOutline.module.css';
import { LessonDefinition } from '@/types/lesson';
import { ProgressState } from '@/features/progress/types';
import { CheckCircle, Circle } from 'lucide-react';

interface LessonOutlineProps {
  lesson: LessonDefinition;
  currentStepId: string;
  progressState: ProgressState;
  archetypeId: string;
  onStepClick: (stepId: string) => void;
}

export const LessonOutline: React.FC<LessonOutlineProps> = ({
  lesson,
  currentStepId,
  progressState,
  archetypeId,
  onStepClick
}) => {
  const steps = lesson.steps;
  const archProgress = progressState.archetypes[archetypeId];
  
  let completedCount = 0;

  return (
    <nav className={styles.outline} role="navigation" aria-label="Chapter outline">
      <div className={styles.header}>
        <h3 className={styles.title}>{lesson.title}</h3>
      </div>
      
      <ol className={styles.stepList}>
        {steps.map((step, index) => {
          const stepProgress = archProgress?.steps[step.id];
          const isCompleted = stepProgress?.completedAt;
          const isVisited = stepProgress?.visitedAt;
          const isActive = currentStepId === step.id;
          
          if (isCompleted) completedCount++;

          return (
            <li 
              key={step.id} 
              className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            >
              <button 
                className={styles.stepButton}
                onClick={() => onStepClick(step.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className={styles.indicator}>
                  {isCompleted ? (
                    <CheckCircle className={styles.iconCompleted} size={18} />
                  ) : isActive || isVisited ? (
                    <div className={styles.dotActive} />
                  ) : (
                    <Circle className={styles.iconPending} size={18} />
                  )}
                </div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepNumber}>Step {index + 1}</span>
                  <span className={styles.stepTitle}>{step.shortTitle || step.title}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      
      <div className={styles.footer}>
        <div className={styles.progressSummary}>
          {completedCount} of {steps.length} completed
        </div>
      </div>
    </nav>
  );
};
