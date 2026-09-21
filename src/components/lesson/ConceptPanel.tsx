import React, { useEffect } from 'react';
import styles from './ConceptPanel.module.css';
import { SharedConcept, ConceptContextEntry } from '@/types/concept';
import { X, ArrowLeft, Sparkles } from 'lucide-react';
import { TradeoffTable } from './TradeoffTable';

interface ConceptPanelProps {
  concept: SharedConcept;
  contextEntry?: ConceptContextEntry;
  onClose: () => void;
  onConceptClick: (conceptId: string) => void;
  onAskAI: (conceptId: string) => void;
  navigationStack: string[];
  onBack: () => void;
}

export const ConceptPanel: React.FC<ConceptPanelProps> = ({
  concept,
  contextEntry,
  onClose,
  onConceptClick,
  onAskAI,
  navigationStack,
  onBack
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          {navigationStack.length > 1 && (
            <button className={styles.iconButton} onClick={onBack} aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className={styles.title}>{concept.title}</h2>
          <button className={styles.iconButton} onClick={onClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <p className={styles.summary}>{concept.summary}</p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Why this exists</h3>
          <p className={styles.text}>{concept.role}</p>
        </section>

        {contextEntry && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Context in this Chapter</h3>
            <p className={styles.text}>{contextEntry.chapterRole}</p>
            {contextEntry.specificConsiderations && contextEntry.specificConsiderations.length > 0 && (
              <ul className={styles.list}>
                {contextEntry.specificConsiderations.map((consideration, idx) => (
                  <li key={idx} className={styles.listItem}>{consideration}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Deep Dive</h3>
          <p className={styles.text}>{concept.explanation}</p>
        </section>

        {contextEntry && contextEntry.exampleData && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Example</h3>
            <pre className={styles.exampleData}>
              <code>{contextEntry.exampleData}</code>
            </pre>
          </section>
        )}

        {concept.tradeoffs && concept.tradeoffs.length > 0 && (
          <section className={styles.section}>
            <TradeoffTable items={concept.tradeoffs} title="Trade-offs" />
          </section>
        )}

        {concept.failureModes && concept.failureModes.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Common Pitfalls</h3>
            <ul className={styles.list}>
              {concept.failureModes.map((fm, idx) => (
                <li key={idx} className={styles.listItem}>{fm}</li>
              ))}
            </ul>
          </section>
        )}

        {concept.relatedConceptIds && concept.relatedConceptIds.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Related Concepts</h3>
            <div className={styles.chips}>
              {concept.relatedConceptIds.map((rcId: string) => (
                <button 
                  key={rcId}
                  className={styles.chip}
                  onClick={() => onConceptClick(rcId)}
                >
                  {rcId}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className={styles.footer}>
          <button className={styles.aiButton} onClick={() => onAskAI(concept.id)}>
            <Sparkles size={18} /> Ask AI about {concept.title}
          </button>
        </div>
      </div>
    </div>
  );
};
