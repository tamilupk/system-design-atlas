import type { ArchetypeMetadata } from '@/types/archetype';

export const urlShortenerMetadata: ArchetypeMetadata = {
  id: 'url-shortener',
  title: 'URL Shortener',
  description: 'Design a service that creates short aliases for long URLs and redirects users efficiently. Covers API design, storage, caching, and scaling reads.',
  stage: 'foundation',
  sequence: 1,
  availability: 'available',
  estimatedMinutes: 45,
  tags: ['url-shortener', 'caching', 'database', 'scaling', 'api-design', 'hashing', 'base62'],
};
