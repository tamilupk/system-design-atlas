import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useProgress } from '@/hooks/useProgress';
import { Check, FileText, Layers, Trash2 } from 'lucide-react';
import styles from './NotesDialog.module.css';

export type NoteScope = 'step' | 'archetype';

interface NotesDialogProps {
  open: boolean;
  onClose: () => void;
  archetypeId: string;
  chapterTitle: string;
  stepId: string;
  stepTitle: string;
  initialScope?: NoteScope;
}

export function NotesDialog({
  open,
  onClose,
  archetypeId,
  chapterTitle,
  stepId,
  stepTitle,
  initialScope = 'step',
}: NotesDialogProps) {
  const { getStepNote, setStepNote, getArchetypeNote, setArchetypeNote } = useProgress();
  const [scope, setScope] = useState<NoteScope>(initialScope);

  // Sync initial scope whenever opened
  useEffect(() => {
    if (open) {
      setScope(initialScope);
    }
  }, [open, initialScope]);

  const stepNote = getStepNote(archetypeId, stepId);
  const chapterNote = getArchetypeNote(archetypeId);

  const currentContent = scope === 'step' ? stepNote : chapterNote;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (scope === 'step') {
      setStepNote(archetypeId, stepId, value);
    } else {
      setArchetypeNote(archetypeId, value);
    }
  };

  const handleClear = () => {
    if (window.confirm(`Clear your note for ${scope === 'step' ? 'this step' : 'this entire chapter'}?`)) {
      if (scope === 'step') {
        setStepNote(archetypeId, stepId, '');
      } else {
        setArchetypeNote(archetypeId, '');
      }
    }
  };

  const wordCount = useMemo(() => {
    const trimmed = currentContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [currentContent]);

  const hasStepNote = Boolean(stepNote.trim());
  const hasChapterNote = Boolean(chapterNote.trim());

  return (
    <Dialog open={open} onClose={onClose} title="Study Notes">
      <div className={styles.container}>
        <div className={styles.scopeSelector} role="tablist" aria-label="Notes scope">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'step'}
            className={`${styles.scopeTab} ${scope === 'step' ? styles.scopeTabActive : ''}`}
            onClick={() => setScope('step')}
          >
            <FileText size={14} />
            <span className={styles.scopeTabLabel}>Current Step</span>
            {hasStepNote && <span className={styles.scopeBadge}>Saved</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={scope === 'archetype'}
            className={`${styles.scopeTab} ${scope === 'archetype' ? styles.scopeTabActive : ''}`}
            onClick={() => setScope('archetype')}
          >
            <Layers size={14} />
            <span className={styles.scopeTabLabel}>Entire Chapter</span>
            {hasChapterNote && <span className={styles.scopeBadge}>Saved</span>}
          </button>
        </div>

        <div className={styles.editorSection}>
          <div className={styles.headerInfo}>
            <span className={styles.targetTitle} title={scope === 'step' ? stepTitle : chapterTitle}>
              {scope === 'step' ? `Step: ${stepTitle}` : `Chapter: ${chapterTitle}`}
            </span>
            <span className={styles.saveIndicator}>
              <Check size={13} />
              Auto-saved
            </span>
          </div>

          <textarea
            className={styles.textarea}
            value={currentContent}
            onChange={handleChange}
            placeholder={
              scope === 'step'
                ? `Take notes on ${stepTitle} — record trade-offs, interviewer questions, bottlenecks, formulas, or key takeaway concepts...`
                : `Take high-level chapter notes for ${chapterTitle} — summarize end-to-end architecture decisions, requirements, and system properties...`
            }
            aria-label={scope === 'step' ? `Notes for ${stepTitle}` : `Notes for ${chapterTitle}`}
            autoFocus
          />

          <div className={styles.metaRow}>
            <div className={styles.stats}>
              <span>{wordCount} words</span>
              <span>{currentContent.length} chars</span>
            </div>
            <span className={styles.hint}>
              Warning: Only persisted in browser. Included in YAML export, make sure to export and save periodically.
            </span>
          </div>
        </div>

        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            disabled={!currentContent}
            title="Clear note content"
          >
            <Trash2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Clear
          </button>

          <div className={styles.rightButtons}>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
