import { ProgressState } from './types';
import { validateProgressState } from './validation';

/**
 * Validates persisted/imported progress and migrates it to the current schema
 * version. Returns `null` when the payload is unusable so the caller can fall
 * back to a fresh state rather than trusting corrupt data.
 *
 * Migration history:
 * - v1 → v2: added `challenges`, `decisionJournal`, and `notes`.
 * - v2 → v3: namespaced `challenges` by archetype ID so chapters that reuse a
 *   challenge ID (for example `storage-strategy`) keep independent progress.
 *
 * The actual rewriting lives in `validateProgressState`, which is the single
 * entry point for every persisted payload (localStorage, cross-tab events, and
 * YAML imports).
 */
export function migrateProgress(data: unknown): ProgressState | null {
  const result = validateProgressState(data);
  if (result.valid) {
    return result.state;
  }
  return null;
}
