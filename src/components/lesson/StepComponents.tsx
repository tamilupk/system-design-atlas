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

interface ParagraphProps {
  children: ReactNode;
  className?: string;
}

export const Paragraph: React.FC<ParagraphProps> = ({ children, className }) => {
  return <p className={`${styles.paragraph} ${className || ''}`}>{children}</p>;
};

interface ListProps {
  children: ReactNode;
  ordered?: boolean;
  className?: string;
}

/** Styled list; use plain `<li>` children. Set `ordered` for a numbered list. */
export const List: React.FC<ListProps> = ({ children, ordered = false, className }) => {
  const classes = `${styles.list} ${className || ''}`;
  return ordered ? <ol className={classes}>{children}</ol> : <ul className={classes}>{children}</ul>;
};

interface ConceptLinkProps {
  /** Registered concept ID; must resolve via `getConcept`. */
  conceptId: string;
  onConceptClick: (conceptId: string) => void;
  children: ReactNode;
}

/**
 * Inline link that opens the concept panel. Rendered as a button because it triggers an
 * in-app action rather than navigating.
 */
export const ConceptLink: React.FC<ConceptLinkProps> = ({ conceptId, onConceptClick, children }) => {
  return (
    <button type="button" className={styles.conceptLink} onClick={() => onConceptClick(conceptId)}>
      {children}
    </button>
  );
};
