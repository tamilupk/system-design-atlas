import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProgress } from '@/hooks/useProgress';
import { archetypeRegistry, isArchetypeAvailable } from '@/archetypes/registry';
import { getConcept } from '@/concepts/registry';
import { LessonOutline } from '@/components/lesson/LessonOutline';
import { LessonPlayer } from '@/components/lesson/LessonPlayer';
import { ConceptPanel } from '@/components/lesson/ConceptPanel';
import { ArchitectureDiagram } from '@/components/diagrams/ArchitectureDiagram';
import { AskAIButton } from '@/components/chat/AskAIButton';
import { PromptDialog } from '@/components/chat/PromptDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { isStepCompleted, getLastVisitedStep } from '@/features/progress/selectors';
import { useLessonNavigation } from '@/hooks/useLessonNavigation';
import { chatProviders } from '@/features/chat-assist/providers';
import type { ArchetypeModule } from '@/types/archetype';
import type { DiagramNode } from '@/types/diagram';
import type { PromptContext } from '@/features/chat-assist/types';
import { Menu, Maximize2, Minimize2, ChevronRight } from 'lucide-react';
import styles from './LessonPage.module.css';

export function LessonPage() {
  const { archetypeId, stepId } = useParams<{ archetypeId: string; stepId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { state, visitStep, completeStep, uncompleteStep, setFocusMode } = useProgress();
  
  const [module, setModule] = useState<ArchetypeModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [conceptPanelOpen, setConceptPanelOpen] = useState(false);
  const [conceptHistory, setConceptHistory] = useState<string[]>([]);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptConceptId, setPromptConceptId] = useState<string | undefined>(undefined);
  
  const focusMode = state.preferences.focusMode;

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
  
  const currentStep = useMemo(() => {
    if (!module || !stepId) return null;
    return module.lesson.steps.find(s => s.id === stepId) || null;
  }, [module, stepId]);
  
  const lessonNav = useLessonNavigation(
    archetypeId || '', 
    module?.lesson || { archetypeId: '', title: '', contentVersion: 1, steps: [] }, 
    stepId || ''
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        lessonNav.goToPrevious();
      } else if (e.key === 'ArrowRight') {
        lessonNav.goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonNav]);

  const handleConceptClick = useCallback((conceptId: string) => {
    setConceptHistory(prev => (prev[prev.length - 1] === conceptId ? prev : [...prev, conceptId]));
    setSearchParams(prev => {
      prev.set('concept', conceptId);
      return prev;
    });
    setConceptPanelOpen(true);
  }, [setSearchParams]);

  const handleCloseConcept = useCallback(() => {
    setConceptHistory([]);
    setSearchParams(prev => {
      prev.delete('concept');
      return prev;
    });
    setConceptPanelOpen(false);
  }, [setSearchParams]);

  const handleConceptBack = useCallback(() => {
    if (conceptHistory.length > 1) {
      const nextHistory = conceptHistory.slice(0, -1);
      const prevConceptId = nextHistory[nextHistory.length - 1];
      setConceptHistory(nextHistory);
      if (prevConceptId) {
        setSearchParams(prev => {
          prev.set('concept', prevConceptId);
          return prev;
        });
      }
    } else {
      handleCloseConcept();
    }
  }, [conceptHistory, handleCloseConcept, setSearchParams]);

  const handleAskAIWithConcept = useCallback((conceptId?: string) => {
    setPromptConceptId(conceptId);
    setPromptDialogOpen(true);
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading lesson...</div>;
  }

  if (error || !module || !currentStep || !archetypeId || !stepId) {
    return (
      <div className={styles.error}>
        <h2 className={styles.errorTitle}>Oops!</h2>
        <p className={styles.errorMessage}>{error || 'Lesson step not found.'}</p>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  const StepContent = module.stepComponents[stepId];
  const diagramState = currentStep.diagramStateId ? module.diagrams.states[currentStep.diagramStateId] : undefined;
  const isCompleted = isStepCompleted(state, archetypeId, stepId);

  const handleComplete = () => {
    completeStep(archetypeId, stepId);
  };
  
  const handleUncomplete = () => {
    uncompleteStep(archetypeId, stepId);
  };

  const stepIndex = module.lesson.steps.findIndex(s => s.id === stepId);

  const promptConcept = promptConceptId ? getConcept(promptConceptId) : activeConcept;
  const promptConceptContext = promptConcept
    ? module.conceptContext[promptConcept.id]?.specificConsiderations.join('\n')
    : undefined;

  const promptContext: Omit<PromptContext, 'action'> = {
    chapterTitle: module.metadata.title,
    stepTitle: currentStep.title,
    stepObjective: currentStep.objective,
    designSummary: module.metadata.description,
    conceptTitle: promptConcept?.title,
    conceptContext: promptConceptContext,
  };

  const providerConfig = chatProviders[state.preferences.chatProvider];

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${focusMode ? styles.focusMode : ''}`}>
        
        <div className={styles.sidebar}>
          <LessonOutline
            lesson={module.lesson}
            currentStepId={stepId}
            progressState={state}
            archetypeId={archetypeId}
            onStepClick={lessonNav.goToStep}
          />
        </div>

        <Drawer
          open={outlineOpen}
          onClose={() => setOutlineOpen(false)}
          title="Lesson Outline"
          side="left"
        >
          <LessonOutline
            lesson={module.lesson}
            currentStepId={stepId}
            progressState={state}
            archetypeId={archetypeId}
            onStepClick={(id) => {
              lessonNav.goToStep(id);
              setOutlineOpen(false);
            }}
          />
        </Drawer>

        <main className={styles.mainContent}>
          <div className={styles.contentInner}>
            <div className={styles.topBar}>
              <div className={styles.mobileMenuButton}>
                <IconButton 
                  icon={<Menu size={20} />} 
                  onClick={() => setOutlineOpen(true)} 
                  label="Open outline" 
                />
              </div>
              
              <div className={styles.breadcrumbs}>
                <span className={styles.breadcrumbItem}>{module.metadata.title}</span>
                <ChevronRight size={14} className={styles.breadcrumbSeparator} />
                <span className={styles.breadcrumbCurrent}>{currentStep.title}</span>
              </div>

              <div className={styles.topBarActions}>
                <AskAIButton 
                  chapterTitle={module.metadata.title}
                  stepTitle={currentStep.title}
                  stepObjective={currentStep.objective}
                  designSummary={module.metadata.description}
                  conceptTitle={activeConcept?.title}
                  conceptContext={activeConceptId && module.conceptContext[activeConceptId] ? module.conceptContext[activeConceptId]?.specificConsiderations.join('\n') : undefined}
                />
                <IconButton
                  icon={focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  onClick={() => setFocusMode(!focusMode)}
                  label={focusMode ? "Exit focus mode" : "Enter focus mode"}
                />
              </div>
            </div>

            {diagramState && (
              <div className={styles.diagramSection}>
                <ArchitectureDiagram
                  diagramState={diagramState}
                  selectedNodeId={null}
                  onNodeClick={(nodeId) => {
                    const node = diagramState.nodes.find((n: DiagramNode) => n.id === nodeId);
                    if (node?.conceptId) {
                      handleConceptClick(node.conceptId);
                    }
                  }}
                  activeFlowSequenceId={currentStep.flowSequenceId}
                />
              </div>
            )}

            {StepContent && (
              <LessonPlayer
                step={currentStep}
                stepComponent={StepContent}
                stepIndex={stepIndex}
                totalSteps={module.lesson.steps.length}
                isCompleted={isCompleted}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onPrevious={lessonNav.goToPrevious}
                onNext={lessonNav.goToNext}
                onConceptClick={handleConceptClick}
                onAskAI={() => handleAskAIWithConcept(undefined)}
                hasPrevious={lessonNav.hasPrevious}
                hasNext={lessonNav.hasNext}
              />
            )}
          </div>
        </main>

        <div className={styles.conceptPanelWrapper}>
          {activeConcept && (
            <ConceptPanel
              concept={activeConcept}
              contextEntry={activeConceptId ? module.conceptContext[activeConceptId] : undefined}
              onClose={handleCloseConcept}
              onConceptClick={handleConceptClick}
              onAskAI={(conceptId) => handleAskAIWithConcept(conceptId)}
              navigationStack={conceptHistory}
              onBack={handleConceptBack}
            />
          )}
        </div>

        <Drawer
          open={conceptPanelOpen && window.innerWidth <= 1024}
          onClose={handleCloseConcept}
          title="Concept"
          side="right"
        >
          {activeConcept && (
            <ConceptPanel
              concept={activeConcept}
              contextEntry={activeConceptId ? module.conceptContext[activeConceptId] : undefined}
              onClose={handleCloseConcept}
              onConceptClick={handleConceptClick}
              onAskAI={(conceptId) => handleAskAIWithConcept(conceptId)}
              navigationStack={conceptHistory}
              onBack={handleConceptBack}
            />
          )}
        </Drawer>
      </div>

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
