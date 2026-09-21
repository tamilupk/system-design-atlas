import { useMemo } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { archetypeCatalog } from '@/archetypes/catalog';
import { CurriculumList } from '@/components/curriculum/CurriculumList';
import { ResumeCard } from '@/components/curriculum/ResumeCard';
import { getResumeInfo, getChapterProgress } from '@/features/progress/selectors';
import styles from './HomePage.module.css';

// Lightweight step ID lists for available chapters (no UI components imported)
const STEP_IDS: Record<string, readonly string[]> = {
  'url-shortener': ['requirements', 'api-data', 'baseline', 'id-generation', 'cache', 'scaling', 'reliability', 'tradeoffs', 'recap'],
};

const STEP_TITLES: Record<string, Record<string, string>> = {
  'url-shortener': {
    'requirements': 'Requirements & Scale',
    'api-data': 'API & Data Model',
    'baseline': 'Baseline Architecture',
    'id-generation': 'Short-Code Generation',
    'cache': 'Caching Layer',
    'scaling': 'Scaling the Service',
    'reliability': 'Reliability & Failure Modes',
    'tradeoffs': 'Design Trade-offs',
    'recap': 'Recap & Interview Prep',
  },
};

export function HomePage() {
  const { state } = useProgress();
  
  const resumeInfo = useMemo(() => getResumeInfo(state), [state]);
  
  const resumeData = useMemo(() => {
    if (!resumeInfo) return null;
    const meta = archetypeCatalog.find(a => a.id === resumeInfo.archetypeId);
    if (!meta || meta.availability !== 'available') return null;
    const stepIds = STEP_IDS[resumeInfo.archetypeId];
    if (!stepIds) return null;
    const progress = getChapterProgress(state, resumeInfo.archetypeId, [...stepIds]);
    const stepTitles = STEP_TITLES[resumeInfo.archetypeId];
    const stepTitle = stepTitles?.[resumeInfo.stepId] ?? resumeInfo.stepId;
    return {
      archetypeTitle: meta.title,
      stepTitle,
      archetypeId: resumeInfo.archetypeId,
      stepId: resumeInfo.stepId,
      progress: { completed: progress.completed, total: progress.total, percentage: progress.percentage },
    };
  }, [resumeInfo, state]);

  const availableCount = archetypeCatalog.filter(a => a.availability === 'available').length;
  const plannedCount = archetypeCatalog.filter(a => a.availability === 'planned').length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>System Design Atlas</h1>
          <p className={styles.subtitle}>
            Learn system design through interactive lessons, architecture diagrams, and hands-on exploration.
          </p>
          <p className={styles.stats}>
            {availableCount} {availableCount === 1 ? 'chapter' : 'chapters'} available · {plannedCount} chapters planned
          </p>
        </header>

        {resumeData && (
          <section className={styles.resumeSection} aria-label="Continue learning">
            <ResumeCard {...resumeData} />
          </section>
        )}

        <section className={styles.curriculumSection} aria-label="Curriculum">
          <CurriculumList
            archetypes={archetypeCatalog}
            progressState={state}
            stepIds={STEP_IDS}
          />
        </section>
      </div>
    </div>
  );
}
