import { ProgressState } from './types';
import { validateProgressState } from './validation';

export interface ImportSummary {
  knownArchetypes: string[];
  unknownArchetypes: string[];
  totalCompletedSteps: number;
}

export async function exportToYaml(state: ProgressState): Promise<string> {
  const { stringify } = await import('yaml');
  const exportState = {
    ...state,
    exportedAt: new Date().toISOString()
  };
  return stringify(exportState);
}

export async function importFromYaml(
  content: string, 
  availableArchetypes: string[] = []
): Promise<{ valid: true; state: ProgressState; summary: ImportSummary } | { valid: false; error: string }> {
  if (content.length > 1024 * 1024) {
    return { valid: false, error: 'File too large (max 1MB)' };
  }

  try {
    const { parse } = await import('yaml');
    const data = parse(content, { customTags: [], maxAliasCount: 10 });
    
    const result = validateProgressState(data);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    const state = result.state;
    const knownArchetypes: string[] = [];
    const unknownArchetypes: string[] = [];
    let totalCompletedSteps = 0;

    for (const [archId, arch] of Object.entries(state.archetypes)) {
      if (availableArchetypes.length > 0 && !availableArchetypes.includes(archId)) {
        unknownArchetypes.push(archId);
      } else {
        knownArchetypes.push(archId);
      }
      for (const step of Object.values(arch.steps)) {
        if (step.completedAt) {
          totalCompletedSteps++;
        }
      }
    }

    return { valid: true, state, summary: { knownArchetypes, unknownArchetypes, totalCompletedSteps } };

  } catch (e: any) {
    return { valid: false, error: e.message || 'Invalid YAML format' };
  }
}
