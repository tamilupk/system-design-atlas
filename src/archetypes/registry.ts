import type { ArchetypeLazyLoader, ArchetypeModule } from '@/types/archetype';

export const archetypeRegistry: Record<string, ArchetypeLazyLoader> = {
  'ticket-booking': async (): Promise<ArchetypeModule> => {
    const mod = await import('./ticket-booking/index');
    return mod.default;
  },
  chat: async (): Promise<ArchetypeModule> => {
    const mod = await import('./chat/index');
    return mod.default;
  },
  'url-shortener': async (): Promise<ArchetypeModule> => {
    const mod = await import('./url-shortener/index');
    return mod.default;
  },
};

export function isArchetypeAvailable(id: string): boolean {
  return Object.hasOwn(archetypeRegistry, id);
}
