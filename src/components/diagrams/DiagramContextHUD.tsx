import React from 'react';
import type { DiagramNode } from '@/types/diagram';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import styles from './DiagramContextHUD.module.css';

interface DiagramContextHUDProps {
  selectedNode: DiagramNode | null;
  onInspect?: (conceptId?: string, node?: DiagramNode) => void;
  onAskAI?: (conceptId?: string) => void;
  onClose?: () => void;
}

export const DiagramContextHUD: React.FC<DiagramContextHUDProps> = ({
  selectedNode,
  onInspect,
  onAskAI,
  onClose,
}) => {
  if (!selectedNode) {
    return null;
  }

  return (
    <div className={`${styles.hud} ${styles.hudSelected}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h4 className={styles.title}>{selectedNode.label}</h4>
          <span className={`${styles.badge} ${styles[selectedNode.role] || ''}`}>
            {selectedNode.role}
          </span>
        </div>
        <p className={styles.description}>
          {selectedNode.description || 'Core system architectural component.'}
        </p>
      </div>

      <div className={styles.actions}>
        {(selectedNode.spec || selectedNode.conceptId) && onInspect && (
          <button
            className={styles.inspectBtn}
            onClick={() => onInspect(selectedNode.conceptId, selectedNode)}
            aria-label={`Inspect ${selectedNode.label} specification`}
          >
            {selectedNode.spec ? 'Component Spec' : 'Deep Dive'} <ArrowRight size={14} />
          </button>
        )}
        {onAskAI && (
          <button
            className={styles.aiBtn}
            onClick={() => onAskAI(selectedNode.conceptId)}
            aria-label={`Ask AI about ${selectedNode.label}`}
          >
            <Sparkles size={14} /> Ask AI
          </button>
        )}
        {onClose && (
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Deselect component"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
