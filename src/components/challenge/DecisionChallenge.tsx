import React, { useState } from 'react';
import type { ChallengeDefinition } from '@/types/challenge';
import { useProgress } from '@/hooks/useProgress';
import { useLessonContext } from '@/components/lesson/LessonContext';
import { getChallengeProgress } from '@/features/progress/selectors';
import { CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import styles from './DecisionChallenge.module.css';

interface DecisionChallengeProps {
  challenge: ChallengeDefinition;
}

/**
 * Wraps the challenge UI so that local selection state is discarded whenever
 * the rendered challenge identity changes. Without the key, swapping one
 * challenge for another in the same slot would keep the previous challenge's
 * selected option and evaluation panel.
 */
export const DecisionChallenge: React.FC<DecisionChallengeProps> = ({ challenge }) => {
  const lesson = useLessonContext();
  const archetypeId = lesson?.archetypeId ?? null;

  return (
    <DecisionChallengeView
      key={`${archetypeId ?? 'no-chapter'}:${challenge.id}`}
      challenge={challenge}
      archetypeId={archetypeId}
    />
  );
};

interface DecisionChallengeViewProps {
  challenge: ChallengeDefinition;
  /** Chapter that owns this challenge; `null` outside a lesson, where progress is not persisted. */
  archetypeId: string | null;
}

const DecisionChallengeView: React.FC<DecisionChallengeViewProps> = ({ challenge, archetypeId }) => {
  const { state, saveChallengeAttempt } = useProgress();

  const savedProgress = archetypeId ? getChallengeProgress(state, archetypeId, challenge.id) : null;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    savedProgress?.selectedOptionId || null
  );
  const [evaluated, setEvaluated] = useState<boolean>(
    Boolean(savedProgress?.completedAt)
  );

  const selectedOption = challenge.options.find(o => o.id === selectedOptionId);

  const handleSimulate = () => {
    if (!selectedOption) return;
    setEvaluated(true);
    if (archetypeId) {
      saveChallengeAttempt(
        archetypeId,
        challenge.id,
        selectedOption.id,
        selectedOption.isOptimal
      );
    }
  };

  const handleRetry = () => {
    setEvaluated(false);
  };

  const isCompletedOptimal = Boolean(savedProgress?.completedAt && savedProgress.demonstratedUnderstanding);

  return (
    <div className={styles.container} role="region" aria-label={`Challenge: ${challenge.title}`}>
      <header className={styles.header}>
        <div className={styles.badgeGroup}>
          <span className={styles.categoryBadge}>{challenge.category}</span>
          {isCompletedOptimal && (
            <span className={styles.completedBadge}>
              <CheckCircle2 size={12} /> Mastered
            </span>
          )}
        </div>
        <h3 className={styles.title}>{challenge.title}</h3>
      </header>

      <div className={styles.scenarioBox}>
        <h4 className={styles.scenarioTitle}>Production Scenario</h4>
        <p className={styles.scenarioText}>{challenge.scenario}</p>
        <div className={styles.interviewCallout}>
          <strong>Senior Interview Focus:</strong> {challenge.interviewContext}
        </div>
      </div>

      <div className={styles.optionsSection}>
        <h4 className={styles.optionsTitle}>Choose Architectural Strategy:</h4>
        {challenge.options.map(option => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
              onClick={() => {
                if (!evaluated) {
                  setSelectedOptionId(option.id);
                }
              }}
              disabled={evaluated}
              role="radio"
              aria-checked={isSelected}
            >
              <div className={styles.optionHeader}>
                <h5 className={styles.optionTitle}>{option.title}</h5>
                <div className={styles.optionRadio}>
                  {isSelected && <div className={styles.optionRadioInner} />}
                </div>
              </div>
              <p className={styles.optionDesc}>{option.description}</p>
            </button>
          );
        })}

        <div className={styles.actions}>
          {!evaluated ? (
            <button
              className={styles.simulateBtn}
              onClick={handleSimulate}
              disabled={!selectedOptionId}
            >
              Simulate & Evaluate Decision <ArrowRight size={15} />
            </button>
          ) : (
            <button className={styles.retryBtn} onClick={handleRetry}>
              <RotateCcw size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Evaluate Another Option
            </button>
          )}
        </div>
      </div>

      {evaluated && selectedOption && (
        <div className={styles.resultPanel} role="status" aria-live="polite">
          <div className={`${styles.resultStatus} ${selectedOption.isOptimal ? styles.resultStatusOptimal : styles.resultStatusSuboptimal}`}>
            {selectedOption.isOptimal ? (
              <>
                <CheckCircle2 size={18} />
                <span>Optimal Architectural Decision</span>
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                <span>Sub-optimal at High Scale</span>
              </>
            )}
          </div>

          <div className={styles.metricBox}>
            <span className={styles.metricTitle}>Simulation Under Production Load:</span>
            <span className={styles.metricValue}>{selectedOption.simulationResult.metric}</span>
            <p className={styles.metricOutcome}>{selectedOption.simulationResult.outcome}</p>
            <p className={styles.metricOutcome}><strong>System Impact:</strong> {selectedOption.simulationResult.impact}</p>
          </div>

          <div className={styles.rationaleSection}>
            <span className={styles.rationaleTitle}>Senior FAANG Engineering Rationale:</span>
            <p className={styles.rationaleText}>{selectedOption.seniorRationale}</p>
          </div>

          <div className={styles.tradeOffText}>
            <strong>Trade-off Breakdown:</strong> {selectedOption.tradeOffSummary}
          </div>
        </div>
      )}
    </div>
  );
};
