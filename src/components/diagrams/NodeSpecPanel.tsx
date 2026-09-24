import React, { useEffect } from 'react';
import type { DiagramNode } from '@/types/diagram';
import { X, Sparkles, BookOpen } from 'lucide-react';
import styles from './NodeSpecPanel.module.css';

interface NodeSpecPanelProps {
  node: DiagramNode;
  onClose: () => void;
  onInspectConcept?: (conceptId: string) => void;
  onAskAI?: (conceptId?: string) => void;
}

export const NodeSpecPanel: React.FC<NodeSpecPanelProps> = ({
  node,
  onClose,
  onInspectConcept,
  onAskAI,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const spec = node.spec;

  return (
    <div className={styles.panel} role="region" aria-label={`Specification for ${node.label}`}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h3 className={styles.title}>{node.label}</h3>
            <span className={styles.badge}>{node.role}</span>
          </div>
          <button className={styles.iconButton} onClick={onClose} aria-label="Close component specification">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {node.description && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Overview</h4>
            <p className={styles.text}>{node.description}</p>
          </section>
        )}

        {node.implementationExamples && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Implementation examples</h4>
            <p className={styles.text}>Possible implementations; configuration and operational trade-offs still matter.</p>
            <ul className={styles.list}>
              {Object.entries(node.implementationExamples).map(([provider, example]) => (
                <li key={provider}>
                  <a href={example.docsUrl} target="_blank" rel="noopener noreferrer">
                    {provider === 'tech' ? 'Tech' : provider.toUpperCase()}: {example.name}
                  </a>
                  {' — '}{example.note}
                </li>
              ))}
            </ul>
          </section>
        )}

        {spec?.responsibilities && spec.responsibilities.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Architectural Responsibilities</h4>
            <ul className={styles.list}>
              {spec.responsibilities.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {spec?.inputsAndProtocols && spec.inputsAndProtocols.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Inputs & Protocols</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {spec.inputsAndProtocols.map((item, idx) => (
                <div key={idx} className={styles.codeItem}>{item}</div>
              ))}
            </div>
          </section>
        )}

        {spec?.outputsAndCodes && spec.outputsAndCodes.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Outputs & Response Codes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {spec.outputsAndCodes.map((item, idx) => (
                <div key={idx} className={styles.codeItem}>{item}</div>
              ))}
            </div>
          </section>
        )}

        {spec?.stateAndPersistence && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>State & Persistence Model</h4>
            <p className={styles.text}>{spec.stateAndPersistence}</p>
          </section>
        )}

        {spec?.failureModes && spec.failureModes.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Failure Modes & Mitigations</h4>
            <ul className={styles.list}>
              {spec.failureModes.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {spec?.tradeoffs && spec.tradeoffs.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Key Trade-offs</h4>
            <ul className={styles.list}>
              {spec.tradeoffs.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.footer}>
          {onAskAI && (
            <button className={styles.aiButton} onClick={() => onAskAI(node.conceptId)}>
              <Sparkles size={16} /> Ask AI about {node.label}
            </button>
          )}
          {node.conceptId && onInspectConcept && (
            <button
              className={styles.conceptLink}
              onClick={() => onInspectConcept(node.conceptId!)}
            >
              <BookOpen size={15} /> View Full Concept Architecture
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
