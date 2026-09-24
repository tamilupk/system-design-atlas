import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Database,
  ChevronLeft,
  ChevronRight,
  Check,
  Keyboard,
  NotebookPen,
  PanelRight,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { useProgress } from '@/hooks/useProgress';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AskAIButton } from '@/components/chat/AskAIButton';
import { useToast } from '@/components/ui/Toast';
import { archetypeCatalog } from '@/archetypes/catalog';
import { useToolbar } from './ToolbarContext';
import type { ProgressState } from '@/features/progress/types';
import type { ImportSummary } from '@/features/progress/yaml-transfer';
import logoUrl from '@/assets/logo.svg';
import githubMarkUrl from '@/assets/github-mark.png';
import styles from './TopToolbar.module.css';
import iconButtonStyles from '@/components/ui/IconButton.module.css';

interface ImportPreviewData {
  state: ProgressState;
  summary: ImportSummary;
}

export function TopToolbar() {
  const { state, dispatch } = useProgress();
  const { addToast } = useToast();
  const { hidden, lessonNav } = useToolbar();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<ImportPreviewData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async () => {
    try {
      const { exportToYaml } = await import('@/features/progress/yaml-transfer');
      const yamlContent = await exportToYaml(state);
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-design-progress-${new Date().toISOString().split('T')[0]}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMenuOpen(false);
      addToast('Progress exported successfully', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
      addToast('File too large (maximum 1MB)', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const yamlContent = event.target?.result as string;
          const { importFromYaml } = await import('@/features/progress/yaml-transfer');
          const availableIds = archetypeCatalog.map(a => a.id);
          const result = await importFromYaml(yamlContent, availableIds);
          if (!result.valid) {
            addToast(`Import error: ${result.error}`, 'error');
            return;
          }
          setImportPreviewData({ state: result.state, summary: result.summary });
          setImportPreviewOpen(true);
        } catch {
          addToast('Invalid YAML file format', 'error');
        }
      };
      reader.readAsText(file);
    } catch {
      addToast('Failed to read file', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMenuOpen(false);
    }
  };

  const handleApplyImport = (mode: 'merge' | 'replace') => {
    if (!importPreviewData) return;
    if (mode === 'merge') {
      dispatch({ type: 'MERGE_STATE', imported: importPreviewData.state });
    } else {
      dispatch({ type: 'REPLACE_STATE', state: importPreviewData.state });
    }
    setImportPreviewOpen(false);
    addToast(`Progress ${mode === 'merge' ? 'merged' : 'replaced'} successfully`, 'success');
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    setResetDialogOpen(false);
    setMenuOpen(false);
    addToast('Progress reset successfully', 'success');
  };

  return (
    <header className={`${styles.toolbar} ${hidden ? styles.hidden : ''}`}>
      <div className={styles.leftSection}>
        <Link to="/" className={styles.brand} aria-label="System Design Atlas">
          <img src={logoUrl} alt="System Design Atlas" className={styles.logoImage} />
        </Link>

        {lessonNav && (
          <>
            <IconButton 
              icon={lessonNav.sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />} 
              onClick={lessonNav.onToggleSidebar} 
              label="Toggle outline" 
              title={lessonNav.sidebarOpen ? "Collapse sidebar [B]" : "Expand sidebar [B]"}
              className={styles.sidebarToggle}
            />
            
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <Link to="/" className={styles.breadcrumbLink}>Atlas</Link>
              <ChevronRight size={13} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbLink}>{lessonNav.breadcrumbs.chapterTitle}</span>
              <ChevronRight size={13} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbCurrent}>{lessonNav.breadcrumbs.stepTitle}</span>
            </nav>
          </>
        )}
      </div>

      {lessonNav && (
        <div className={styles.centerSection}>
          <div className={styles.stepNavGroup}>
            <div className={styles.stepNav} role="navigation" aria-label="Step navigation">
              <button
                className={styles.stepNavBtn}
                onClick={lessonNav.stepNav.goToPrevious}
                disabled={!lessonNav.stepNav.hasPrevious}
                title="Previous step [Left Arrow]"
                aria-label="Previous step"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span
                className={styles.stepCounter}
                style={{ minWidth: `calc(${String(lessonNav.stepNav.totalSteps).length * 2 + 3}ch + var(--space-3))` }}
              >
                {lessonNav.stepNav.currentIndex} / {lessonNav.stepNav.totalSteps}
              </span>

              <button
                className={styles.stepNavBtn}
                onClick={lessonNav.stepNav.goToNext}
                disabled={!lessonNav.stepNav.hasNext}
                title="Next step [Right Arrow]"
                aria-label="Next step"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              className={`${styles.markCompleteBtn} ${lessonNav.isCompleted ? styles.markCompleteBtnActive : ''}`}
              onClick={lessonNav.onToggleComplete}
              title={lessonNav.isCompleted ? "Click to mark incomplete [M]" : "Mark step complete without advancing [M]"}
              aria-label={lessonNav.isCompleted ? "Step completed, click to mark incomplete" : "Mark step complete"}
            >
              <Check size={14} className={styles.markCompleteIcon} />
              <span className={styles.markCompleteText}>
                {lessonNav.isCompleted ? 'Completed' : 'Mark complete'}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <a
          href="https://github.com/tamilupk/system-design-atlas"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub (opens in a new tab)"
          title="View source on GitHub (opens in a new tab)"
          className={`${iconButtonStyles.iconButton} ${iconButtonStyles.ghost} ${iconButtonStyles.md} ${styles.actionIconBtn}`}
        >
          <span className={iconButtonStyles.iconWrapper}>
            <img src={githubMarkUrl} alt="" aria-hidden="true" className={styles.githubMark} />
          </span>
        </a>
        {lessonNav?.onOpenShortcuts && (
          <IconButton
            icon={<Keyboard size={16} />}
            onClick={lessonNav.onOpenShortcuts}
            label="Keyboard shortcuts"
            title="Keyboard shortcuts [?]"
            className={styles.actionIconBtn}
          />
        )}

        {lessonNav?.onOpenNotes && (
          <IconButton
            icon={<NotebookPen size={16} />}
            onClick={lessonNav.onOpenNotes}
            label="Study notes"
            title="Study notes [N]"
            className={`${styles.actionIconBtn} ${lessonNav.hasNotes ? styles.actionIconBtnActive : ''}`}
          />
        )}

        {lessonNav?.inspectAction && (
          <Button 
            variant={lessonNav.inspectAction.isOpen ? "primary" : "secondary"}
            size="sm"
            onClick={lessonNav.inspectAction.onToggle}
            aria-label={lessonNav.inspectAction.isOpen ? "Hide component inspector" : "Open component inspector"}
            className={styles.inspectBtn}
          >
            <PanelRight size={15} />
            <span>{lessonNav.inspectAction.isOpen ? 'Hide' : 'Inspect'}</span>
          </Button>
        )}

        <div className={styles.menuWrapper} ref={menuRef}>
          <button 
            className={styles.iconMenuButton} 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Data"
            title="Data management (Export, Import, Reset)"
          >
            <Database size={16} />
          </button>
          
          {menuOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleExport}>
                <Download size={16} /> Export YAML
              </button>
              <button className={styles.dropdownItem} onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} /> Import YAML
              </button>
              <button className={styles.dropdownItemDanger} onClick={() => { setMenuOpen(false); setResetDialogOpen(true); }}>
                <RotateCcw size={16} /> Reset Progress
              </button>
            </div>
          )}
        </div>

        {lessonNav?.askAIProps && (
          <AskAIButton 
            chapterTitle={lessonNav.askAIProps.chapterTitle}
            stepTitle={lessonNav.askAIProps.stepTitle}
            stepObjective={lessonNav.askAIProps.stepObjective}
            designSummary={lessonNav.askAIProps.designSummary}
            conceptTitle={lessonNav.askAIProps.conceptTitle}
            conceptContext={lessonNav.askAIProps.conceptContext}
          />
        )}
      </div>

      <input
        type="file"
        accept=".yaml,.yml"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className={styles.fileInput}
        aria-hidden="true"
      />

      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Reset Progress"
      >
        <p>Are you sure you want to reset all your progress? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleReset}>Reset Progress</Button>
        </div>
      </Dialog>

      <Dialog
        open={importPreviewOpen}
        onClose={() => setImportPreviewOpen(false)}
        title="Import Progress"
      >
        {importPreviewData && (
          <div>
            <p>Found {importPreviewData.summary.knownArchetypes.length} known chapters in this file.</p>
            {importPreviewData.summary.unknownArchetypes.length > 0 && (
              <p style={{ marginTop: '8px', color: 'var(--color-warning)' }}>
                Notice: {importPreviewData.summary.unknownArchetypes.length} unknown chapter(s) ({importPreviewData.summary.unknownArchetypes.join(', ')}) will be ignored.
              </p>
            )}
            <p style={{ marginTop: '8px' }}>Total completed steps in import: {importPreviewData.summary.totalCompletedSteps}</p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="ghost" onClick={() => setImportPreviewOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleApplyImport('merge')}>Merge</Button>
              <Button variant="primary" onClick={() => handleApplyImport('replace')}>Replace</Button>
            </div>
          </div>
        )}
      </Dialog>
    </header>
  );
}
