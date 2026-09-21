import { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { buildPrompt, PROMPT_ACTIONS } from '@/features/chat-assist/build-prompt';
import type { PromptContext, PromptAction, ChatProviderConfig } from '@/features/chat-assist/types';
import styles from './PromptDialog.module.css';

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  context: Omit<PromptContext, 'action'>;
  providerConfig: ChatProviderConfig;
}

export function PromptDialog({ open, onClose, context, providerConfig }: PromptDialogProps) {
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

  const handleOpenProvider = () => {
    window.open(providerConfig.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Ask AI Assistant">
      <div className={styles.container}>
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
          Paste this prompt into your chatbot, then continue the conversation there.
        </p>
        
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleCopy} className={styles.copyBtn}>
            <Copy size={16} /> Copy Prompt
          </Button>
          <Button variant="primary" onClick={handleOpenProvider} className={styles.openBtn}>
            Open {providerConfig.name} <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
