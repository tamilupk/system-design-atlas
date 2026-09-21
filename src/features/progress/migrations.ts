import { ProgressState } from './types';
import { validateProgressState } from './validation';

export function migrateProgress(data: unknown): ProgressState | null {
  const result = validateProgressState(data);
  if (result.valid) {
    return result.state;
  }
  // Future versions would add migration logic here
  return null;
}
