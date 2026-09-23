import React, { ReactNode } from 'react';
import styles from './StepComponents.module.css';

// Re-export key lesson components for single-import convenience
export { CodeBlock } from './CodeBlock';
export { TradeoffTable } from './TradeoffTable';
export { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
export { default as stepStyles } from './StepComponents.module.css';

interface StepContentProps {
  children: ReactNode;
  className?: string;
}

export const StepContent: React.FC<StepContentProps> = ({ children, className }) => {
  return <div className={`${styles.content} ${className || ''}`}>{children}</div>;
};

interface StepSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const StepSection: React.FC<StepSectionProps> = ({ title, children, className }) => {
  return (
    <section className={`${styles.section} ${className || ''}`}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {children}
    </section>
  );
};

export type CalloutVariant = 'insight' | 'warning' | 'failure' | 'default';

interface CalloutProps {
  label: string;
  variant?: CalloutVariant;
  children: ReactNode;
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  label,
  variant = 'insight',
  children,
  className,
}) => {
  const variantClass = 
    variant === 'warning' ? styles.calloutWarning :
    variant === 'failure' ? styles.calloutFailure :
    variant === 'insight' ? styles.calloutInsight : '';

  return (
    <div className={`${styles.callout} ${variantClass} ${className || ''}`}>
      <div className={styles.calloutLabel}>{label}</div>
      <div className={styles.secondaryText}>{children}</div>
    </div>
  );
};

interface CardGridProps {
  children: ReactNode;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ children, className }) => {
  return <div className={`${styles.grid} ${className || ''}`}>{children}</div>;
};

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`${styles.card} ${className || ''}`}>
      {title && <h4 className={styles.cardTitle}>{title}</h4>}
      <div className={styles.secondaryText}>{children}</div>
    </div>
  );
};

interface InlineCodeProps {
  children: ReactNode;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
  return <code className={styles.inlineCode}>{children}</code>;
};
