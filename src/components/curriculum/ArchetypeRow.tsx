import { type FC } from 'react';
import { Link } from 'react-router-dom';
import styles from './ArchetypeRow.module.css';
import type { ArchetypeMetadata } from '@/types/archetype';
import { Clock, Play, RotateCcw, CheckCircle } from 'lucide-react';

interface ArchetypeRowProps {
  metadata: ArchetypeMetadata;
  progress: { visited: number; completed: number; total: number; percentage: number };
  isNextAvailable: boolean;
}

export const ArchetypeRow: FC<ArchetypeRowProps> = ({ metadata, progress, isNextAvailable }) => {
  const isAvailable = metadata.availability === 'available';
  const isPlanned = metadata.availability === 'planned';

  return (
    <div className={`${styles.row} ${isNextAvailable ? styles.nextAvailable : ''} ${isPlanned ? styles.planned : ''}`}>
      <div className={styles.left}>
        <div className={styles.sequence}>{metadata.sequence}</div>
        <div className={styles.info}>
          <div className={styles.header}>
            <h3 className={styles.title}>{metadata.title}</h3>
            <div className={styles.badgeGroup}>
              <span className={`${styles.stage} ${styles[metadata.stage]}`}>{metadata.stage}</span>
              {isPlanned && <span className={styles.plannedBadge}>Planned</span>}
            </div>
          </div>
          <p className={styles.description}>{metadata.description}</p>
        </div>
      </div>
      
      <div className={styles.right}>
        {isAvailable && (
          <>
            <div className={styles.meta}>
              <span className={styles.time}><Clock size={16} /> {metadata.estimatedMinutes} min</span>
              {progress.total > 0 && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${Math.round(progress.percentage)}%` }} />
                  </div>
                  <span className={styles.progressText}>{Math.round(progress.percentage)}%</span>
                </div>
              )}
            </div>
            
            <div className={styles.action}>
              {progress.visited === 0 && (
                <Link to={`/archetypes/${metadata.id}`} className={styles.buttonStart}>
                  <Play size={16} /> Start
                </Link>
              )}
              {progress.visited > 0 && progress.percentage < 100 && (
                <Link to={`/archetypes/${metadata.id}`} className={styles.buttonResume}>
                  <RotateCcw size={16} /> Resume
                </Link>
              )}
              {progress.percentage >= 100 && (
                <Link to={`/archetypes/${metadata.id}`} className={styles.buttonReview}>
                  <CheckCircle size={16} /> Review
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
