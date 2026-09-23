import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import { archetypeRegistry, isArchetypeAvailable } from '@/archetypes/registry';
import { getConcept } from '@/concepts/registry';
import { LessonOutline } from '@/components/lesson/LessonOutline';
import { ConceptPanel } from '@/components/lesson/ConceptPanel';
import { NodeSpecPanel } from '@/components/diagrams/NodeSpecPanel';
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram';
import { PromptDialog } from '@/components/chat/PromptDialog';
import { NotesDialog } from '@/components/notes/NotesDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { isStepCompleted, getLastVisitedStep } from '@/features/progress/selectors';
import { useLessonNavigation } from '@/hooks/useLessonNavigation';
import { chatProviders } from '@/features/chat-assist/providers';
import { useToolbar } from '@/components/layout/ToolbarContext';
import type { ArchetypeModule } from '@/types/archetype';
import type { DiagramNode } from '@/types/diagram';
import type { PromptContext } from '@/features/chat-assist/types';
import { 
  ChevronRight, 
  ChevronLeft
} from 'lucide-react';
import styles from './LessonPage.module.css';

const DEFAULT_EXPLANATION_WIDTH = 340;
const MIN_EXPLANATION_WIDTH = 260;
const MAX_EXPLANATION_WIDTH = 750;
const STORAGE_KEY_EXPLANATION_WIDTH = 'system-design-atlas-explanation-width';

export function LessonPage() {
  const { archetypeId, stepId } = useParams<{ archetypeId: string; stepId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { state, visitStep, completeStep, uncompleteStep } = useProgress();
  const { setLessonNav } = useToolbar();
  
  const [module, setModule] = useState<ArchetypeModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectedNode, setInspectedNode] = useState<DiagramNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(() => Boolean(searchParams.get('concept')));
  const [conceptHistory, setConceptHistory] = useState<string[]>([]);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptConceptId, setPromptConceptId] = useState<string | undefined>(undefined);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // Adjustable visual stage / explanation panel splitter state
  const [explanationWidth, setExplanationWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_EXPLANATION_WIDTH);
        if (saved) {
          const parsed = Number(saved);
          if (!isNaN(parsed) && parsed >= MIN_EXPLANATION_WIDTH && parsed <= MAX_EXPLANATION_WIDTH) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_EXPLANATION_WIDTH;
  });
  const isDraggingRef = useRef(false);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(DEFAULT_EXPLANATION_WIDTH);
  const explanationWidthRef = useRef<number>(explanationWidth);
  explanationWidthRef.current = explanationWidth;

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingSplitter(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try {
      localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(explanationWidthRef.current));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = dragStartXRef.current - e.clientX;
      const maxAllowedWidth = Math.min(MAX_EXPLANATION_WIDTH, window.innerWidth - 380);
      const newWidth = Math.max(MIN_EXPLANATION_WIDTH, Math.min(maxAllowedWidth, dragStartWidthRef.current + deltaX));
      setExplanationWidth(newWidth);
    };

    const handleWindowPointerUp = () => {
      stopDragging();
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [stopDragging]);

  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingSplitter(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = explanationWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleSplitterDoubleClick = () => {
    setExplanationWidth(DEFAULT_EXPLANATION_WIDTH);
    try {
      localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(DEFAULT_EXPLANATION_WIDTH));
    } catch {
      // ignore
    }
  };

  const handleSplitterKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const maxAllowedWidth = Math.min(MAX_EXPLANATION_WIDTH, window.innerWidth - 380);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setExplanationWidth(prev => {
        const next = Math.min(maxAllowedWidth, prev + step);
        try { localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(next)); } catch {}
        return next;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setExplanationWidth(prev => {
        const next = Math.max(MIN_EXPLANATION_WIDTH, prev - step);
        try { localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(next)); } catch {}
        return next;
      });
    } else if (e.key === 'Home' || e.key === 'Enter') {
      e.preventDefault();
      handleSplitterDoubleClick();
    }
  };

  const activeConceptId = searchParams.get('concept') || undefined;
  const activeConcept = activeConceptId ? getConcept(activeConceptId) : undefined;
  
  useEffect(() => {
    let mounted = true;
    async function loadModule() {
      if (!archetypeId || !isArchetypeAvailable(archetypeId)) {
        setError('Lesson not found or not yet available.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const loader = archetypeRegistry[archetypeId];
        if (!loader) {
          setError('Lesson loader not found.');
          return;
        }
        const mod = await loader();
        if (mounted) {
          setModule(mod);
          setError(null);
        }
      } catch {
        if (mounted) setError('Failed to load lesson module.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadModule();
    return () => { mounted = false; };
  }, [archetypeId]);

  useEffect(() => {
    if (module && archetypeId && !stepId) {
      const lastVisited = getLastVisitedStep(state, archetypeId);
      const firstStep = module.lesson.steps[0];
      const targetStepId = lastVisited || (firstStep ? firstStep.id : '');
      if (targetStepId) {
        navigate(`/archetypes/${archetypeId}/steps/${targetStepId}`, { replace: true });
      }
    }
  }, [module, archetypeId, stepId, navigate, state]);

  useEffect(() => {
    if (archetypeId && stepId) {
      visitStep(archetypeId, stepId);
    }
  }, [archetypeId, stepId, visitStep]);

  useEffect(() => {
    setSelectedNodeId(null);
    setInspectedNode(null);
  }, [stepId]);

  const currentStep = useMemo(() => {
    if (!module || !stepId) return null;
    return module.lesson.steps.find(s => s.id === stepId) || null;
  }, [module, stepId]);

  const stepIndex = useMemo(() => {
    if (!module || !stepId) return -1;
    return module.lesson.steps.findIndex(s => s.id === stepId);
  }, [module, stepId]);

  const lessonNav = useLessonNavigation(
    archetypeId || '',
    module?.lesson || { archetypeId: '', title: '', contentVersion: 1, steps: [] },
    stepId || ''
  );

  const StepContent = useMemo(() => {
    if (!module || !stepId) return null;
    return module.stepComponents[stepId] || null;
  }, [module, stepId]);

  const diagramState = useMemo(() => {
    if (!module || !currentStep || !currentStep.diagramStateId) return null;
    return module.diagrams.states[currentStep.diagramStateId] || null;
  }, [module, currentStep]);

  const isCompleted = useMemo(() => {
    if (!archetypeId || !stepId) return false;
    return isStepCompleted(state, archetypeId, stepId);
  }, [state, archetypeId, stepId]);

  const hasNotes = useMemo(() => {
    if (!archetypeId) return false;
    const chapterNote = state.notes?.archetypes?.[archetypeId];
    const stepNote = stepId ? state.notes?.steps?.[archetypeId]?.[stepId] : undefined;
    return Boolean(chapterNote?.trim() || stepNote?.trim());
  }, [state.notes, archetypeId, stepId]);

  const handleComplete = useCallback(() => {
    if (archetypeId && stepId) {
      completeStep(archetypeId, stepId);
    }
  }, [archetypeId, stepId, completeStep]);

  const handleUncomplete = useCallback(() => {
    if (archetypeId && stepId) {
      uncompleteStep(archetypeId, stepId);
    }
  }, [archetypeId, stepId, uncompleteStep]);

  const handleConceptClick = useCallback((conceptId: string) => {
    setConceptHistory(prev => (prev[prev.length - 1] === conceptId ? prev : [...prev, conceptId]));
    setSearchParams(prev => {
      prev.set('concept', conceptId);
      return prev;
    });
    setInspectedNode(null);
    setInspectorOpen(true);
  }, [setSearchParams]);

  const handleInspectNode = useCallback((conceptId?: string, node?: DiagramNode) => {
    if (conceptId) {
      handleConceptClick(conceptId);
      setInspectedNode(node || null);
      setInspectorOpen(true);
    } else if (node) {
      setInspectedNode(node);
      setInspectorOpen(true);
    }
  }, [handleConceptClick]);

  const handleCloseInspector = useCallback(() => {
    setInspectorOpen(false);
    setInspectedNode(null);
    setConceptHistory([]);
    setSearchParams(prev => {
      prev.delete('concept');
      return prev;
    });
  }, [setSearchParams]);

  const handleConceptBack = useCallback(() => {
    setConceptHistory(prev => {
      const nextHistory = prev.slice(0, -1);
      const prevConceptId = nextHistory[nextHistory.length - 1];
      if (prevConceptId) {
        setSearchParams(p => {
          p.set('concept', prevConceptId);
          return p;
        });
      } else {
        handleCloseInspector();
      }
      return nextHistory;
    });
  }, [handleCloseInspector, setSearchParams]);

  const handleAskAIWithConcept = useCallback((conceptId?: string) => {
    setPromptConceptId(conceptId);
    setPromptDialogOpen(true);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && lessonNav.hasPrevious) {
        lessonNav.goToPrevious();
      } else if (e.key === 'ArrowRight' && lessonNav.hasNext) {
        lessonNav.goToNext();
      } else if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'c') {
        if (isCompleted) {
          handleUncomplete();
        } else {
          handleComplete();
        }
      } else if (e.key.toLowerCase() === 'b') {
        setSidebarOpen(prev => !prev);
      } else if (e.key.toLowerCase() === 'n') {
        setNotesOpen(prev => !prev);
      } else if (e.key === '?') {
        setShortcutsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (inspectorOpen) {
          handleCloseInspector();
        } else if (selectedNodeId) {
          setSelectedNodeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonNav, isCompleted, handleComplete, handleUncomplete, inspectorOpen, handleCloseInspector, selectedNodeId]);

  const promptConcept = promptConceptId ? getConcept(promptConceptId) : activeConcept;
  const promptConceptContext = promptConcept && module
    ? module.conceptContext[promptConcept.id]?.specificConsiderations.join('\n')
    : undefined;

  const promptContext: Omit<PromptContext, 'action'> = {
    chapterTitle: module?.metadata.title || '',
    stepTitle: currentStep?.title || '',
    stepObjective: currentStep?.objective || '',
    designSummary: module?.metadata.description || '',
    conceptTitle: promptConcept?.title,
    conceptContext: promptConceptContext,
  };

  const providerConfig = chatProviders[state.preferences.chatProvider];

  useEffect(() => {
    if (!module || !currentStep) {
      setLessonNav(null);
      return;
    }

    setLessonNav({
      sidebarOpen,
      onToggleSidebar: () => {
        if (window.innerWidth <= 1024) {
          setOutlineOpen(prev => !prev);
        } else {
          setSidebarOpen(prev => !prev);
        }
      },
      breadcrumbs: {
        chapterTitle: module.metadata.title,
        stepTitle: currentStep.title,
      },
      stepNav: {
        currentIndex: stepIndex + 1,
        totalSteps: module.lesson.steps.length,
        hasPrevious: lessonNav.hasPrevious,
        hasNext: lessonNav.hasNext,
        goToPrevious: lessonNav.goToPrevious,
        goToNext: lessonNav.goToNext,
      },
      isCompleted,
      onToggleComplete: () => {
        if (isCompleted) {
          handleUncomplete();
        } else {
          handleComplete();
        }
      },
      onOpenShortcuts: () => setShortcutsOpen(true),
      onOpenNotes: () => setNotesOpen(true),
      hasNotes,
      inspectAction: (activeConcept || inspectedNode) ? {
        isOpen: inspectorOpen,
        onToggle: () => setInspectorOpen(prev => !prev),
      } : undefined,
      askAIProps: {
        chapterTitle: module.metadata.title,
        stepTitle: currentStep.title,
        stepObjective: currentStep.objective,
        designSummary: module.metadata.description,
        conceptTitle: activeConcept?.title,
        conceptContext: activeConceptId && module.conceptContext[activeConceptId]
          ? module.conceptContext[activeConceptId]?.specificConsiderations.join('\n')
          : undefined,
      },
    });

    return () => {
      setLessonNav(null);
    };
  }, [
    module,
    currentStep,
    stepIndex,
    lessonNav.hasPrevious,
    lessonNav.hasNext,
    lessonNav.goToPrevious,
    lessonNav.goToNext,
    sidebarOpen,
    isCompleted,
    hasNotes,
    handleComplete,
    handleUncomplete,
    inspectorOpen,
    activeConcept,
    inspectedNode,
    activeConceptId,
    setLessonNav,
  ]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
        Loading lesson...
      </div>
    );
  }

  if (error || !module || !currentStep) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Lesson Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 var(--space-6)' }}>
          {error || 'Unable to locate this step.'}
        </p>
        <Link to="/" style={{ padding: '8px 16px', background: '#000', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
          Back to Curriculum
        </Link>
      </div>
    );
  }

  const hasDiagram = Boolean(diagramState && diagramState.nodes.length > 0);
  const isInspectorVisible = inspectorOpen && Boolean(activeConcept || inspectedNode);

  return (
    <div className={styles.page}>
      {/* Main Layout Area */}
      <div className={styles.bodyLayout}>
        {/* Left Collapsible Outline (Zero width when closed) */}
        <aside 
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
          aria-label="Lesson outline"
        >
          <LessonOutline
            lesson={module.lesson}
            currentStepId={stepId || ''}
            progressState={state}
            archetypeId={archetypeId || ''}
            onStepClick={lessonNav.goToStep}
          />
        </aside>

        {/* Slide-over Drawer for Outline on Narrow Screens */}
        <Drawer
          open={outlineOpen}
          onClose={() => setOutlineOpen(false)}
          title="Lesson Outline"
          side="left"
          noPadding
          className={styles.mobileDrawer}
        >
          <LessonOutline
            lesson={module.lesson}
            currentStepId={stepId || ''}
            progressState={state}
            archetypeId={archetypeId || ''}
            showHeader={false}
            onStepClick={(id) => {
              lessonNav.goToStep(id);
              setOutlineOpen(false);
            }}
          />
        </Drawer>

        {/* Center / Main Area */}
        {hasDiagram ? (
          <>
            {/* Primary Visual Surface: Interactive Diagram */}
            <main className={styles.visualStage} role="region" aria-label="Architecture diagram visual stage">
              <div className={styles.diagramContainer}>
                <ArchitectureDiagram
                  diagramState={diagramState!}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(nodeId) => {
                    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
                  }}
                  onInspectNode={handleInspectNode}
                  onAskAIAboutNode={(cId) => handleAskAIWithConcept(cId)}
                  onClearNodeSelection={() => setSelectedNodeId(null)}
                  activeFlowSequenceId={currentStep.flowSequenceId}
                />
              </div>
            </main>

            {/* Draggable Divider Splitter between Visual Stage and Explanation Panel */}
            <div
              className={`${styles.resizer} ${isDraggingSplitter ? styles.resizerActive : ''}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize explanation panel (drag left or right, or use arrow keys)"
              aria-valuenow={Math.round(explanationWidth)}
              aria-valuemin={MIN_EXPLANATION_WIDTH}
              aria-valuemax={MAX_EXPLANATION_WIDTH}
              tabIndex={0}
              onPointerDown={handleSplitterPointerDown}
              onDoubleClick={handleSplitterDoubleClick}
              onKeyDown={handleSplitterKeyDown}
              title="Drag left or right to resize panel. Double-click to reset."
            >
              <div className={styles.resizerGrip} />
            </div>

            {/* Dedicated Explanation Panel */}
            <aside
              className={styles.explanationColumn}
              style={{ width: `${explanationWidth}px` }}
              aria-label="Step explanations and learning challenges"
            >
              <div className={styles.lessonHeader}>
                <span className={styles.lessonStepIndex}>Step {stepIndex + 1} of {module.lesson.steps.length}</span>
                <h1 className={styles.lessonTitle}>{currentStep.title}</h1>
                <p className={styles.lessonObjective}>{currentStep.objective}</p>
                {Boolean(currentStep.concepts && currentStep.concepts.length > 0) && (
                  <div className={styles.conceptTags}>
                    <span className={styles.conceptTagLabel}>Concepts:</span>
                    {currentStep.concepts?.map(cId => {
                      const c = getConcept(cId);
                      return (
                        <button
                          key={cId}
                          className={styles.conceptTag}
                          onClick={() => handleConceptClick(cId)}
                        >
                          {c?.title || cId}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {StepContent && (
                <div className={styles.stepContentWrapper}>
                  <StepContent 
                    step={currentStep}
                    onConceptClick={handleConceptClick}
                  />
                </div>
              )}
            </aside>
          </>
        ) : (
          /* When step has no diagram: Centered Reading Canvas */
          <main className={styles.visualStageFullText} role="main" aria-label="Lesson reading content">
            <div className={styles.lessonHeader} style={{ marginBottom: 'var(--space-6)' }}>
              <span className={styles.lessonStepIndex}>Step {stepIndex + 1} of {module.lesson.steps.length}</span>
              <h1 className={styles.lessonTitle} style={{ fontSize: 'var(--text-2xl)' }}>{currentStep.title}</h1>
              <p className={styles.lessonObjective} style={{ fontSize: 'var(--text-base)', margin: 'var(--space-3) 0' }}>
                {currentStep.objective}
              </p>
              {Boolean(currentStep.concepts && currentStep.concepts.length > 0) && (
                <div className={styles.conceptTags}>
                  <span className={styles.conceptTagLabel}>Concepts:</span>
                  {currentStep.concepts?.map(cId => {
                    const c = getConcept(cId);
                    return (
                      <button
                        key={cId}
                        className={styles.conceptTag}
                        onClick={() => handleConceptClick(cId)}
                      >
                        {c?.title || cId}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {StepContent && (
              <div className={styles.stepContentWrapper}>
                <StepContent 
                  step={currentStep}
                  onConceptClick={handleConceptClick}
                />
              </div>
            )}

            <div style={{ marginTop: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
              {lessonNav.hasPrevious ? (
                <Button variant="secondary" size="sm" onClick={lessonNav.goToPrevious}>
                  <ChevronLeft size={16} /> Previous Step
                </Button>
              ) : <div />}
              {lessonNav.hasNext ? (
                <Button variant="primary" size="sm" onClick={lessonNav.goToNext}>
                  Next Step <ChevronRight size={16} />
                </Button>
              ) : (
                <Link to="/" style={{ padding: '6px 14px', background: '#000', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                  Finish Chapter &rarr;
                </Link>
              )}
            </div>
          </main>
        )}

        {/* Collapsible Right Inspector on Desktop (0 width when closed) */}
        {isInspectorVisible && (
          <aside className={`${styles.desktopInspector} ${styles.desktopInspectorOpen}`} aria-label="Component and Concept Inspector">
            {inspectedNode && inspectedNode.spec ? (
              <NodeSpecPanel
                node={inspectedNode}
                onClose={handleCloseInspector}
                onInspectConcept={(cId) => {
                  handleConceptClick(cId);
                  setInspectedNode(null);
                }}
                onAskAI={(cId) => handleAskAIWithConcept(cId)}
              />
            ) : activeConcept ? (
              <ConceptPanel
                concept={activeConcept}
                contextEntry={activeConceptId ? module.conceptContext[activeConceptId] : undefined}
                onClose={handleCloseInspector}
                onConceptClick={handleConceptClick}
                onAskAI={(cId) => handleAskAIWithConcept(cId)}
                navigationStack={conceptHistory}
                onBack={handleConceptBack}
              />
            ) : null}
          </aside>
        )}

        {/* Slide-over Drawer for Inspector on Narrow Screens */}
        <Drawer
          open={isInspectorVisible}
          onClose={handleCloseInspector}
          title={inspectedNode?.label || activeConcept?.title || 'Component Inspector'}
          side="right"
          noPadding
          hideHeader
          className={styles.mobileDrawer}
        >
          {inspectedNode && inspectedNode.spec ? (
            <NodeSpecPanel
              node={inspectedNode}
              onClose={handleCloseInspector}
              onInspectConcept={(cId) => {
                handleConceptClick(cId);
                setInspectedNode(null);
              }}
              onAskAI={(cId) => handleAskAIWithConcept(cId)}
            />
          ) : activeConcept ? (
            <ConceptPanel
              concept={activeConcept}
              contextEntry={activeConceptId ? module.conceptContext[activeConceptId] : undefined}
              onClose={handleCloseInspector}
              onConceptClick={handleConceptClick}
              onAskAI={(cId) => handleAskAIWithConcept(cId)}
              navigationStack={conceptHistory}
              onBack={handleConceptBack}
            />
          ) : null}
        </Drawer>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard Shortcuts">
        <div className={styles.keyboardShortcutModal}>
          <div className={styles.shortcutRow}>
            <span>Next step</span>
            <span className={styles.kbd}>&rarr;</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Previous step</span>
            <span className={styles.kbd}>&larr;</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Mark step complete / uncomplete</span>
            <span className={styles.kbd}>M</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Toggle lesson outline</span>
            <span className={styles.kbd}>B</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Study notes (step / chapter)</span>
            <span className={styles.kbd}>N</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Close inspector / deselect node</span>
            <span className={styles.kbd}>Esc</span>
          </div>
          <div className={styles.shortcutRow}>
            <span>Keyboard shortcuts help</span>
            <span className={styles.kbd}>?</span>
          </div>
        </div>
      </Dialog>

      {/* Study Notes Dialog */}
      {notesOpen && archetypeId && currentStep && module && (
        <NotesDialog
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          archetypeId={archetypeId}
          chapterTitle={module.metadata.title}
          stepId={currentStep.id}
          stepTitle={currentStep.title}
        />
      )}

      {/* AI Assistant Dialog */}
      {promptDialogOpen && (
        <PromptDialog
          open={promptDialogOpen}
          onClose={() => setPromptDialogOpen(false)}
          context={promptContext}
          providerConfig={providerConfig}
        />
      )}
    </div>
  );
}
