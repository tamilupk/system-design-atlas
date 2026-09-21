# Progress Format

This document details how user progress is stored, merged, and validated in System Design Atlas.

## Storage
Progress is saved in `localStorage` under the key `sda_progress_v1`.

## Schema

```typescript
type ProgressState = {
  version: 1;
  lastUpdated: number; // Unix timestamp
  chapters: Record<string, ChapterProgress>;
};

type ChapterProgress = {
  status: 'not_started' | 'in_progress' | 'completed';
  completedSteps: string[]; // Stable step IDs
  lastAccessed: number;     // Unix timestamp
  firstStarted: number;     // Unix timestamp
};
```

## Validation Rules

When loading progress from storage or importing from a file, the app must validate:
1. `version` must be a known number (currently `1`).
2. `chapters` must be a valid object mapping string IDs to valid `ChapterProgress` objects.
3. Steps in `completedSteps` must be strings. Unknown step IDs should be preserved (in case of downgrades or removed steps), but they should not count towards chapter completion percentage.

## Synchronization & Merge Behavior

When handling multiple sources of progress (e.g., cross-tab sync or importing an existing file), progress is merged:
- **Union Steps**: `completedSteps` becomes a unique array of steps from both sources.
- **Timestamps**:
  - `firstStarted`: The earliest timestamp wins.
  - `lastAccessed`: The most recent timestamp wins.
  - `lastUpdated`: The most recent timestamp wins.
- **Status**: Computed dynamically based on the union of `completedSteps` against the current chapter definition, rather than blindly copying the string.

### Replace Behavior

If the user explicitly chooses to "overwrite" progress during import, the loaded YAML completely replaces the local state. No merging occurs.

## Cross-Tab Behavior

The app uses a `storage` event listener. When `localStorage` changes in another tab, the current tab receives the new state and updates its React context. We use a "last-write-wins" approach for the overall document, but ideally, since we have distinct chapter keys, only the modified chapter needs updating. In simple implementations, replacing the in-memory state with the new JSON from storage is sufficient.

## Round-Trip Behavior

Exporting the local progress to a YAML file, and then immediately importing that same YAML file with the "merge" strategy, should result in a `ProgressState` object identical to the original one (idempotent).

## Migration Policy

If the schema changes in the future, the `version` must be incremented.
A migration function must be provided to convert `version: 1` data into `version: 2` data during load.

## Recovery from Corruption

If `localStorage` contains unparseable JSON or invalid schema structures that cannot be migrated, the application will fallback to a completely fresh state (as if the user had no progress). It may present a generic warning or console error, but it must not crash the application.
