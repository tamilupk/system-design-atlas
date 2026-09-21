import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, RotateCcw, ChevronDown } from 'lucide-react';
import { ChatProviderSelect } from '@/components/chat/ChatProviderSelect';
import { useProgress } from '@/hooks/useProgress';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { archetypeCatalog } from '@/archetypes/catalog';
import type { ProgressState } from '@/features/progress/types';
import type { ImportSummary } from '@/features/progress/yaml-transfer';
import styles from './TopToolbar.module.css';

interface ImportPreviewData {
  state: ProgressState;
  summary: ImportSummary;
}

export function TopToolbar() {
  const { state, dispatch } = useProgress();
  const { addToast } = useToast();
  
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
    <header className={styles.toolbar}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandFull}>System Design Atlas</span>
        <span className={styles.brandShort}>SDA</span>
      </Link>

      <div className={styles.actions}>
        <ChatProviderSelect />
        
        <div className={styles.menuWrapper} ref={menuRef}>
          <button 
            className={styles.menuButton} 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            Data <ChevronDown size={16} />
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
