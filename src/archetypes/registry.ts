import type { ArchetypeLazyLoader, ArchetypeModule } from '@/types/archetype';

export const archetypeRegistry: Record<string, ArchetypeLazyLoader> = {
  'url-shortener': async (): Promise<ArchetypeModule> => {
    const mod = await import('./url-shortener/index');
    return mod.default;
  },
};

export function isArchetypeAvailable(id: string): boolean {
  return Object.hasOwn(archetypeRegistry, id);
}
