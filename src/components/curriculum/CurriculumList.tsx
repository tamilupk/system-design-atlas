import { useState, useMemo, type FC } from 'react';
import styles from './CurriculumList.module.css';
import type { ArchetypeMetadata } from '@/types/archetype';
import type { ProgressState } from '@/features/progress/types';
import { getChapterProgress } from '@/features/progress/selectors';
import { STAGE_LABELS } from '@/archetypes/catalog';
import { ArchetypeRow } from './ArchetypeRow';

interface CurriculumListProps {
  archetypes: readonly ArchetypeMetadata[];
  progressState: ProgressState;
  stepIds: Record<string, readonly string[]>;
}

type FilterTab = 'All' | 'Available' | 'In progress' | 'Completed' | 'Planned';

export const CurriculumList: FC<CurriculumListProps> = ({ archetypes, progressState, stepIds }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const filteredArchetypes = useMemo(() => {
    return archetypes.filter(arch => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = arch.title.toLowerCase().includes(query);
        const matchesDesc = (arch.description || '').toLowerCase().includes(query);
        const matchesTags = arch.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      const chapterProgress = getChapterProgress(progressState, arch.id, [...(stepIds[arch.id] || [])]);
      const isCompleted = chapterProgress.percentage === 100 && chapterProgress.total > 0;
      const isInProgress = chapterProgress.visited > 0 && !isCompleted;
      
      switch (activeFilter) {
        case 'Available': return arch.availability === 'available';
        case 'In progress': return isInProgress;
        case 'Completed': return isCompleted;
        case 'Planned': return arch.availability === 'planned';
        default: return true;
      }
    });
  }, [archetypes, searchQuery, activeFilter, progressState, stepIds]);

  const grouped = filteredArchetypes.reduce((acc, arch) => {
    const list = acc[arch.stage] ?? [];
    list.push(arch);
    acc[arch.stage] = list;
    return acc;
  }, {} as Record<string, ArchetypeMetadata[]>);

  const stages = ['foundation', 'advanced', 'genai'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search curriculum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {(['All', 'Available', 'In progress', 'Completed', 'Planned'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`${styles.filterTab} ${activeFilter === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {filteredArchetypes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No chapters match your search or filter criteria.</p>
          </div>
        ) : (
          stages.map(stage => {
            const stageArchetypes = grouped[stage];
            if (!stageArchetypes || stageArchetypes.length === 0) return null;

            return (
              <div key={stage} className={styles.stageGroup}>
                <h2 className={styles.stageTitle}>
                  {STAGE_LABELS[stage] || stage}
                </h2>
                <div className={styles.rows}>
                  {stageArchetypes.map(arch => {
                    const chapterProgress = getChapterProgress(progressState, arch.id, [...(stepIds[arch.id] || [])]);
                    return (
                      <ArchetypeRow
                        key={arch.id}
                        metadata={arch}
                        progress={{
                          visited: chapterProgress.visited,
                          completed: chapterProgress.completed,
                          total: chapterProgress.total,
                          percentage: chapterProgress.percentage
                        }}
                        isNextAvailable={false}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
