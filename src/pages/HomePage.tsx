import { useMemo } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { archetypeCatalog } from '@/archetypes/catalog';
import { chapterStepManifests, getStepIds, getStepTitle, isKnownStep } from '@/archetypes/step-manifests';
import { CurriculumList } from '@/components/curriculum/CurriculumList';
import { ResumeCard } from '@/components/curriculum/ResumeCard';
import { getResumeInfo, getChapterProgress } from '@/features/progress/selectors';
import styles from './HomePage.module.css';

export function HomePage() {
  const { state } = useProgress();
  
  const resumeInfo = useMemo(() => getResumeInfo(state), [state]);
  
  const resumeData = useMemo(() => {
    if (!resumeInfo) return null;
    const meta = archetypeCatalog.find(a => a.id === resumeInfo.archetypeId);
    if (!meta || meta.availability !== 'available') return null;
    // Ignore resume targets that no longer exist in the chapter's manifest.
    if (!isKnownStep(resumeInfo.archetypeId, resumeInfo.stepId)) return null;
    const stepIds = getStepIds(resumeInfo.archetypeId);
    const progress = getChapterProgress(state, resumeInfo.archetypeId, [...stepIds]);
    return {
      archetypeTitle: meta.title,
      stepTitle: getStepTitle(resumeInfo.archetypeId, resumeInfo.stepId),
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
            stepManifests={chapterStepManifests}
          />
        </section>
      </div>
    </div>
  );
}
