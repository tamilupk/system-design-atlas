import type { ChapterStepManifest } from '@/types/lesson';

/**
 * Data-only index of this chapter's steps, in lesson order.
 *
 * Mirrors the `id` / `title` / `shortTitle` of every entry in `lesson.ts` so that
 * chapter-agnostic surfaces can enumerate steps without importing the lesson, its
 * diagrams, or any step component. `validateStepManifest` (run in the unit tests) fails
 * if this list and `lesson.ts` disagree, so the duplication cannot drift.
 */
export const urlShortenerStepManifest: ChapterStepManifest = [
  { id: 'requirements', title: 'Requirements & Scale', shortTitle: 'Requirements' },
  { id: 'api-data', title: 'API & Data Model', shortTitle: 'API & Data' },
  { id: 'baseline', title: 'Baseline Architecture', shortTitle: 'Baseline' },
  { id: 'id-generation', title: 'Short-Code Generation', shortTitle: 'ID Generation' },
  { id: 'cache', title: 'Caching Layer', shortTitle: 'Caching' },
  { id: 'scaling', title: 'Scaling the Service', shortTitle: 'Scaling' },
  { id: 'reliability', title: 'Reliability & Failure Modes', shortTitle: 'Reliability' },
  { id: 'tradeoffs', title: 'Design Trade-offs', shortTitle: 'Trade-offs' },
  { id: 'recap', title: 'Recap & Interview Prep', shortTitle: 'Recap' },
];
