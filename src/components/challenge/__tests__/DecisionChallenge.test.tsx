import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DecisionChallenge } from '@/components/challenge/DecisionChallenge';
import { LessonProvider } from '@/components/lesson/LessonContext';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { STORAGE_KEY } from '@/features/progress/storage';
import { CURRENT_SCHEMA_VERSION } from '@/features/progress/types';
import type { ChallengeDefinition } from '@/types/challenge';

function makeChallenge(id: string, title: string): ChallengeDefinition {
  return {
    id,
    title,
    category: 'Test Category',
    scenario: `Scenario for ${title}.`,
    interviewContext: 'Interview focus.',
    options: [
      {
        id: 'opt-a',
        title: 'Option A',
        description: 'First option.',
        isOptimal: true,
        simulationResult: { metric: '10ms', outcome: 'Fast', impact: 'Good' },
        seniorRationale: 'Because A.',
        tradeOffSummary: 'Tradeoff A.',
      },
      {
        id: 'opt-b',
        title: 'Option B',
        description: 'Second option.',
        isOptimal: false,
        simulationResult: { metric: '900ms', outcome: 'Slow', impact: 'Bad' },
        seniorRationale: 'Because B.',
        tradeOffSummary: 'Tradeoff B.',
      },
    ],
  };
}

function renderInLesson(archetypeId: string, ui: ReactNode) {
  return render(
    <ProgressProvider>
      <LessonProvider archetypeId={archetypeId}>{ui}</LessonProvider>
    </ProgressProvider>
  );
}

describe('DecisionChallenge', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it('evaluates a chosen option and shows the optimal result', () => {
    renderInLesson('url-shortener', <DecisionChallenge challenge={makeChallenge('storage-strategy', 'Storage Strategy')} />);

    fireEvent.click(screen.getByRole('radio', { name: /Option A/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simulate & Evaluate Decision/i }));

    expect(screen.getByText('Optimal Architectural Decision')).toBeInTheDocument();
    cleanup();
  });

  it('persists mastery per chapter so a colliding challenge ID stays independent', () => {
    const storageStrategy = makeChallenge('storage-strategy', 'Storage Strategy');

    // Master the challenge in the first chapter; progress is written through to localStorage.
    renderInLesson('url-shortener', <DecisionChallenge challenge={storageStrategy} />);
    fireEvent.click(screen.getByRole('radio', { name: /Option A/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simulate & Evaluate Decision/i }));
    cleanup();

    // The persisted payload must be namespaced by archetype, never keyed globally.
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(Object.keys(stored.challenges)).toEqual(['url-shortener']);
    expect(stored.challenges['url-shortener']['storage-strategy'].demonstratedUnderstanding).toBe(true);

    // Re-opening the same chapter restores the mastered badge.
    renderInLesson('url-shortener', <DecisionChallenge challenge={storageStrategy} />);
    expect(screen.getByText(/Mastered/i)).toBeInTheDocument();
    cleanup();

    // A different chapter reusing the same challenge ID starts fresh.
    renderInLesson('rate-limiter', <DecisionChallenge challenge={storageStrategy} />);
    expect(screen.queryByText(/Mastered/i)).not.toBeInTheDocument();
    cleanup();
  });

  it('does not leak a selected option when the rendered challenge changes', () => {
    const { rerender } = render(
      <ProgressProvider>
        <LessonProvider archetypeId="url-shortener">
          <DecisionChallenge challenge={makeChallenge('challenge-one', 'Challenge One')} />
        </LessonProvider>
      </ProgressProvider>
    );

    // Select an option in the first challenge but do not evaluate it.
    fireEvent.click(screen.getByRole('radio', { name: /Option A/i }));

    // Swap in a different challenge in the same slot.
    rerender(
      <ProgressProvider>
        <LessonProvider archetypeId="url-shortener">
          <DecisionChallenge challenge={makeChallenge('challenge-two', 'Challenge Two')} />
        </LessonProvider>
      </ProgressProvider>
    );

    // The new challenge must start unselected: no radio is checked and the
    // simulate button is disabled.
    const radios = screen.getAllByRole('radio');
    expect(radios.every(r => r.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(screen.getByRole('button', { name: /Simulate & Evaluate Decision/i })).toBeDisabled();
    cleanup();
  });
});
