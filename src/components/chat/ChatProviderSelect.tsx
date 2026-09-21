import { useProgress } from '@/hooks/useProgress';
import { chatProviders } from '@/features/chat-assist/providers';
import type { ChatProvider } from '@/features/progress/types';
import styles from './ChatProviderSelect.module.css';

export function ChatProviderSelect() {
  const { state, setChatProvider } = useProgress();

  return (
    <div className={styles.wrapper}>
      <label htmlFor="chat-provider" className="sr-only">AI Assistant</label>
      <select
        id="chat-provider"
        className={styles.select}
        value={state.preferences.chatProvider}
        onChange={(e) => setChatProvider(e.target.value as ChatProvider)}
      >
        {Object.values(chatProviders).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
