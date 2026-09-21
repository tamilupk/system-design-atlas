import React from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  size = 'md',
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`${styles.container} ${styles[size]} ${className}`}
    >
      <div
        className={styles.fill}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
