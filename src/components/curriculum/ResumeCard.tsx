import { type FC } from 'react';
import { Link } from 'react-router-dom';
import styles from './ResumeCard.module.css';
import { Play } from 'lucide-react';

interface ResumeCardProps {
  archetypeTitle: string;
  stepTitle: string;
  archetypeId: string;
  stepId: string;
  progress: { completed: number; total: number; percentage: number };
}

export const ResumeCard: FC<ResumeCardProps> = ({
  archetypeTitle,
  stepTitle,
  archetypeId,
  stepId,
  progress
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Continue Learning</span>
      </div>
      <div className={styles.content}>
        <div className={styles.info}>
          <h2 className={styles.archetypeTitle}>{archetypeTitle}</h2>
          <p className={styles.stepTitle}>Current step: {stepTitle}</p>
          
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progress.percentage}%` }} 
              />
            </div>
            <span className={styles.progressText}>
              {Math.round(progress.percentage)}% Complete
            </span>
          </div>
        </div>
        
        <Link to={`/archetypes/${archetypeId}/steps/${stepId}`} className={styles.resumeButton}>
          <Play size={18} />
          Resume
        </Link>
      </div>
    </div>
  );
};
