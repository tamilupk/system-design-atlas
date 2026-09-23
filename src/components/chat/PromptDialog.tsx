import { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { buildPrompt, PROMPT_ACTIONS } from '@/features/chat-assist/build-prompt';
import { getProviderUrl, chatProviders } from '@/features/chat-assist/providers';
import { useProgress } from '@/hooks/useProgress';
import { ChatProviderSelect } from './ChatProviderSelect';
import type { PromptContext, PromptAction, ChatProviderConfig } from '@/features/chat-assist/types';
import styles from './PromptDialog.module.css';

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  context: Omit<PromptContext, 'action'>;
  providerConfig?: ChatProviderConfig;
}

export function PromptDialog({ open, onClose, context, providerConfig: propProviderConfig }: PromptDialogProps) {
  const { state } = useProgress();
  const activeProvider = chatProviders[state.preferences.chatProvider] || propProviderConfig || chatProviders.chatgpt;
  const { addToast } = useToast();
  const [action, setAction] = useState<PromptAction>('explain');
  const [customQuestion, setCustomQuestion] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState(() =>
    buildPrompt({ ...context, action: 'explain' })
  );
  
  useEffect(() => {
    const fullContext: PromptContext = {
      ...context,
      action,
      userQuestion: action === 'custom' ? customQuestion : undefined,
    };
    setGeneratedPrompt(buildPrompt(fullContext));
  }, [action, customQuestion, context]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      addToast('Copied prompt to clipboard', 'success');
    } catch {
      addToast('Please select text and copy manually', 'error');
    }
  };

  const handleOpenProvider = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
    } catch {
      // ignore clipboard write failure when opening external window
    }
    const targetUrl = getProviderUrl(activeProvider, generatedPrompt);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Ask AI Assistant">
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div className={styles.actionSelector}>
            {PROMPT_ACTIONS.map(a => (
              <button
                key={a.id}
                className={`${styles.actionButton} ${action === a.id ? styles.active : ''}`}
                onClick={() => setAction(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className={styles.providerRow}>
            <span className={styles.providerLabel}>Model:</span>
            <ChatProviderSelect />
          </div>
        </div>
        
        {action === 'custom' && (
          <input
            type="text"
            className={styles.customInput}
            placeholder="What do you want to ask?"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
          />
        )}
        
        <div className={styles.promptArea}>
          <textarea
            className={styles.textarea}
            value={generatedPrompt}
            onChange={(e) => setGeneratedPrompt(e.target.value)}
            aria-label="Generated prompt"
          />
        </div>
        
        <p className={styles.note}>
          {activeProvider.supportsUrlPrefill
            ? `Clicking below will open ${activeProvider.name} and autofill the prompt into the chat box.`
            : `Clicking below will copy the prompt to your clipboard and open ${activeProvider.name} — then simply press Cmd+V / Ctrl+V to paste.`}
        </p>
        
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleCopy} className={styles.copyBtn}>
            <Copy size={16} /> Copy Prompt
          </Button>
          <Button variant="primary" onClick={handleOpenProvider} className={styles.openBtn}>
            Open {activeProvider.name} <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
