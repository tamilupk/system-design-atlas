import type { ChatProvider } from '@/features/progress/types';

export interface ChatProviderConfig {
  readonly id: ChatProvider;
  readonly name: string;
  readonly url: string;
  readonly icon: string;
  readonly supportsUrlPrefill: boolean;
}

export type PromptAction =
  | 'explain'
  | 'example'
  | 'compare'
  | 'failures'
  | 'custom';

export interface PromptContext {
  readonly chapterTitle: string;
  readonly stepTitle: string;
  readonly stepObjective: string;
  readonly designSummary: string;
  readonly conceptTitle?: string;
  readonly conceptContext?: string;
  readonly userQuestion?: string;
  readonly action: PromptAction;
}
