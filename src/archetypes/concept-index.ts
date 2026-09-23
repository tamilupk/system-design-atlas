import type { ArchetypeMetadata, ArchetypeModule } from '@/types/archetype';
import type { ConceptContextEntry } from '@/types/concept';

export interface ChapterConceptContext {
  readonly metadata: ArchetypeMetadata;
  readonly entry: ConceptContextEntry;
}

/** Shared by browser concept pages and static rendering. */
export function buildConceptIndex(chapters: readonly ArchetypeModule[]): Map<string, ChapterConceptContext[]> {
  const index = new Map<string, ChapterConceptContext[]>();
  for (const chapter of chapters) {
    for (const [conceptId, entry] of Object.entries(chapter.conceptContext)) {
      const contexts = index.get(conceptId) ?? [];
      contexts.push({ metadata: chapter.metadata, entry });
      index.set(conceptId, contexts);
    }
  }
  return index;
}
