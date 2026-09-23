import { createContext, useContext, useState, type ReactNode } from 'react';

export interface LessonNavState {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  breadcrumbs: {
    chapterTitle: string;
    stepTitle: string;
  };
  stepNav: {
    currentIndex: number;
    totalSteps: number;
    hasPrevious: boolean;
    hasNext: boolean;
    goToPrevious: () => void;
    goToNext: () => void;
  };
  isCompleted: boolean;
  onToggleComplete: () => void;
  onOpenShortcuts: () => void;
  onOpenNotes?: () => void;
  hasNotes?: boolean;
  inspectAction?: {
    isOpen: boolean;
    onToggle: () => void;
  };
  askAIProps?: {
    chapterTitle: string;
    stepTitle: string;
    stepObjective: string;
    designSummary: string;
    conceptTitle?: string;
    conceptContext?: string;
  };
}

interface ToolbarContextType {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  lessonNav: LessonNavState | null;
  setLessonNav: (nav: LessonNavState | null) => void;
}

const ToolbarContext = createContext<ToolbarContextType>({
  hidden: false,
  setHidden: () => {},
  lessonNav: null,
  setLessonNav: () => {},
});

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [lessonNav, setLessonNav] = useState<LessonNavState | null>(null);

  return (
    <ToolbarContext.Provider value={{ hidden, setHidden, lessonNav, setLessonNav }}>
      {children}
    </ToolbarContext.Provider>
  );
}

export function useToolbar() {
  return useContext(ToolbarContext);
}
