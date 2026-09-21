import type { ChatProviderConfig } from './types';
import type { ChatProvider } from '@/features/progress/types';

export const chatProviders: Record<ChatProvider, ChatProviderConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    icon: 'MessageSquare',
    supportsUrlPrefill: false,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    icon: 'Bot',
    supportsUrlPrefill: false,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    icon: 'Sparkles',
    supportsUrlPrefill: false,
  },
};

export function getProviderConfig(id: ChatProvider): ChatProviderConfig {
  return chatProviders[id];
}
