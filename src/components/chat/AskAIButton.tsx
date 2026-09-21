import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PromptDialog } from './PromptDialog';
import { useProgress } from '@/hooks/useProgress';
import { chatProviders } from '@/features/chat-assist/providers';
import type { PromptContext } from '@/features/chat-assist/types';
import styles from './AskAIButton.module.css';

interface AskAIButtonProps {
  chapterTitle: string;
  stepTitle: string;
  stepObjective: string;
  designSummary: string;
  conceptTitle?: string;
  conceptContext?: string;
}

export function AskAIButton(props: AskAIButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { state } = useProgress();
  
  const providerConfig = chatProviders[state.preferences.chatProvider];
  
  const context: Omit<PromptContext, 'action'> = {
    chapterTitle: props.chapterTitle,
    stepTitle: props.stepTitle,
    stepObjective: props.stepObjective,
    designSummary: props.designSummary,
    conceptTitle: props.conceptTitle,
    conceptContext: props.conceptContext
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className={styles.button}
        onClick={() => setDialogOpen(true)}
      >
        <Sparkles size={16} className={styles.icon} />
        Ask AI
      </Button>
      
      {dialogOpen && (
        <PromptDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          context={context}
          providerConfig={providerConfig}
        />
      )}
    </>
  );
}
