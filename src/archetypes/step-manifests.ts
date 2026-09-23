import type { ChapterStepManifest } from '@/types/lesson';
import { urlShortenerStepManifest } from './url-shortener/steps-manifest';

/**
 * Index of every chapter's data-only step manifest.
 *
 * These files contain step IDs and titles only — no lesson content, diagrams, or step
 * components — so importing this index keeps the home page and the curriculum list
 * chapter-agnostic without breaking lazy loading of chapter content.
 *
 * Adding a chapter: create `src/archetypes/<id>/steps-manifest.ts` and register it here.
 * `validateArchetypeCatalog` fails the test suite if an available chapter is missing an
 * entry, and `validateArchetypeModule` fails if the manifest disagrees with the lesson.
 */
export const chapterStepManifests: Readonly<Record<string, ChapterStepManifest>> = {
  'url-shortener': urlShortenerStepManifest,
};

export function getStepManifest(archetypeId: string): ChapterStepManifest | undefined {
  return Object.hasOwn(chapterStepManifests, archetypeId) ? chapterStepManifests[archetypeId] : undefined;
}

export function getStepIds(archetypeId: string): readonly string[] {
  return getStepManifest(archetypeId)?.map((step) => step.id) ?? [];
}

/** Full title, falling back to the short title, falling back to the raw step ID. */
export function getStepTitle(archetypeId: string, stepId: string): string {
  const step = getStepManifest(archetypeId)?.find((candidate) => candidate.id === stepId);
  return step?.title ?? step?.shortTitle ?? stepId;
}

/** True when `stepId` is a real step of `archetypeId`; used to reject stale resume targets. */
export function isKnownStep(archetypeId: string, stepId: string): boolean {
  return getStepManifest(archetypeId)?.some((step) => step.id === stepId) ?? false;
}
