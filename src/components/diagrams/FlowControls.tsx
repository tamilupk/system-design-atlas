import React from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { FlowSequence } from '@/types/diagram';
import { IconButton } from '@/components/ui/IconButton';
import styles from './FlowControls.module.css';

interface FlowControlsProps {
  flowSequence: FlowSequence | undefined;
  currentEventIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onReset: () => void;
}

export const FlowControls: React.FC<FlowControlsProps> = ({
  flowSequence,
  currentEventIndex,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onReset
}) => {
  if (!flowSequence || flowSequence.events.length === 0) {
    return null;
  }

  const events = flowSequence.events;
  const isEnd = currentEventIndex >= events.length - 1;
  const currentEvent = events[currentEventIndex];

  return (
    <div className={styles.controlsContainer}>
      <div className={styles.controls}>
        {isPlaying ? (
          <IconButton
            icon={<Pause size={18} />}
            onClick={onPause}
            label="Pause flow"
            title="Pause"
          />
        ) : (
          <IconButton
            icon={<Play size={18} />}
            onClick={onPlay}
            label="Play flow"
            title="Play"
            disabled={isEnd}
          />
        )}
        
        <IconButton
          icon={<SkipForward size={18} />}
          onClick={onNext}
          label="Next event"
          title="Next"
          disabled={isEnd}
        />
        
        <IconButton
          icon={<RotateCcw size={18} />}
          onClick={onReset}
          label="Reset flow"
          title="Reset"
          disabled={currentEventIndex === 0}
        />
        
        <div className={styles.divider} />
        
        <div className={styles.status}>
          <span className={styles.step}>
            Event {currentEventIndex + 1} of {events.length}
          </span>
          <span className={styles.description}>
            {currentEvent?.description}
          </span>
        </div>
      </div>
    </div>
  );
};
