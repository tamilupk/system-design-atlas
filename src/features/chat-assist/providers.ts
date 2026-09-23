import type { ChatProviderConfig } from './types';
import type { ChatProvider } from '@/features/progress/types';

export const chatProviders: Record<ChatProvider, ChatProviderConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    icon: 'MessageSquare',
    supportsUrlPrefill: true,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    icon: 'Bot',
    supportsUrlPrefill: true,
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

export function getProviderUrl(provider: ChatProviderConfig, prompt?: string): string {
  if (provider.supportsUrlPrefill && prompt) {
    if (provider.id === 'chatgpt') {
      return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    }
    if (provider.id === 'claude') {
      return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    }
  }
  return provider.url;
}
