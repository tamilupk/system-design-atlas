import { createContext, useContext, type ReactNode } from 'react';

export interface LessonContextValue {
  /**
   * The chapter being rendered. Challenge progress is namespaced by this ID,
   * so a challenge rendered outside a lesson cannot be saved.
   */
  readonly archetypeId: string;
}

const LessonContext = createContext<LessonContextValue | null>(null);

export function LessonProvider({ archetypeId, children }: { archetypeId: string; children: ReactNode }) {
  return <LessonContext.Provider value={{ archetypeId }}>{children}</LessonContext.Provider>;
}

/**
 * Returns the current chapter ID, or `null` when no lesson is being rendered.
 * Shared lesson components use this to scope persisted state per chapter.
 */
export function useLessonContext(): LessonContextValue | null {
  return useContext(LessonContext);
}
