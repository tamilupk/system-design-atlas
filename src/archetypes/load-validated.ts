import type { ArchetypeLazyLoader, ArchetypeMetadata, ArchetypeModule } from '@/types/archetype';
import type { ChapterStepManifest } from '@/types/lesson';
import { validateArchetypeCatalog, validateArchetypeModule, formatArchetypeIssues } from './validate';

export interface ChapterSources {
  readonly catalog: readonly ArchetypeMetadata[];
  readonly registry: Readonly<Record<string, ArchetypeLazyLoader>>;
  readonly manifests: Readonly<Record<string, ChapterStepManifest>>;
}

/** Fail before emitting any public routes when an authoring contract is broken. */
export async function loadValidatedChapters(sources: ChapterSources, knownConceptIds: readonly string[]): Promise<ArchetypeModule[]> {
  const { catalog, registry, manifests } = sources;
  const catalogResult = validateArchetypeCatalog({
    catalog, registeredIds: Object.keys(registry), manifestIds: Object.keys(manifests),
  });
  if (!catalogResult.valid) throw new Error(formatArchetypeIssues('catalog', catalogResult.issues));
  const chapters: ArchetypeModule[] = [];
  for (const metadata of catalog.filter(entry => entry.availability === 'available')) {
    try {
      const loader = registry[metadata.id];
      if (!loader) throw new Error('Missing loader');
      const chapter = await loader();
      if (chapter.metadata.id !== metadata.id) throw new Error('Loaded module ID differs from catalog ID');
      const result = validateArchetypeModule(chapter, { knownConceptIds, stepManifest: manifests[metadata.id] });
      if (!result.valid) throw new Error(formatArchetypeIssues(metadata.id, result.issues));
      chapters.push(chapter);
    } catch (error) {
      throw new Error(`Invalid archetype "${metadata.id}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return chapters;
}
