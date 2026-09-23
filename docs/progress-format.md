# Progress Format

This document details how user progress is stored, validated, migrated, and merged in System Design Atlas. The source of truth is `src/features/progress/` — `types.ts` (schema), `validation.ts` (validation + migration), `reducer.ts` (mutations and merge), `storage.ts` (persistence), `selectors.ts` (derived values).

## Storage

Progress is saved in `localStorage` under the key `system-design-atlas-progress-v1` (exported as `STORAGE_KEY` from `src/features/progress/storage.ts`). The key name is historical and is deliberately **not** versioned: the `-v1` suffix identifies the storage slot, while the document inside carries its own `schemaVersion` (currently `3`). Renaming the key on every schema bump would orphan existing readers' progress, so upgrades are handled by migration instead.

`ProgressProvider` writes the full state on every change and listens for the `storage` event to sync other tabs. When `localStorage` is unavailable (private mode, quota, SSR), `isStorageAvailable()` returns false, the app runs in-memory, and `storageAvailable: false` is exposed so the UI can warn the user.

## Schema

```typescript
interface ProgressState {
  readonly app: 'system-design-atlas';   // Fixed discriminator; rejects foreign documents
  readonly schemaVersion: 1 | 2 | 3;     // 1 and 2 are accepted on read and migrated to 3
  readonly exportedAt?: string;          // ISO timestamp, set on YAML export
  readonly preferences: Preferences;
  readonly lastVisited: LastVisited | null;
  readonly archetypes: Record<string, ArchetypeProgress>;
  readonly challenges?: ChallengesByArchetype;
  readonly decisionJournal?: readonly DecisionJournalEntry[];
  readonly notes?: UserNotes;
}

type ChallengesByArchetype = Record<string, ChallengeProgressMap>;   // archetypeId → challengeId → progress
type ChallengeProgressMap = Record<string, ChallengeProgress>;

interface Preferences {
  readonly chatProvider: 'chatgpt' | 'claude' | 'gemini';
  readonly focusMode: boolean;
}

interface LastVisited {
  readonly archetypeId: string;
  readonly stepId: string;
  readonly visitedAt: string;            // ISO timestamp
}

interface ArchetypeProgress {
  readonly lastStepId: string;
  readonly updatedAt: string;            // ISO timestamp
  readonly steps: Record<string, StepProgress>;
}

interface StepProgress {
  readonly visitedAt: string | null;
  readonly completedAt: string | null;   // null = visited but not completed
}

interface ChallengeProgress {
  readonly challengeId: string;
  readonly attemptedAt: string;
  readonly completedAt: string | null;
  readonly selectedOptionId: string | null;
  readonly demonstratedUnderstanding: boolean;
  readonly notesDraft?: string;
}

interface DecisionJournalEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly stepId: string;
  readonly title: string;
  readonly decision: string;
  readonly rationale: string;
  readonly consequences: string;
}

interface UserNotes {
  readonly archetypes: Record<string, string>;                 // chapter-scoped notes
  readonly steps: Record<string, Record<string, string>>;      // archetypeId → stepId → note
}
```

**There is no stored `status` and no `completedSteps[]` array.** Completion is a per-step `completedAt` timestamp, and every aggregate (chapter percentage, overall counts, resume point) is derived on demand by `selectors.ts` against the current lesson definition. This means unknown or removed step IDs are preserved in storage but never count toward completion.

**Challenges are namespaced by archetype.** Challenge IDs are only unique *within* a chapter, so two chapters may both define `storage-strategy`; keying them globally would let one chapter's answer overwrite the other's. Read them with `getChallengeProgress(state, archetypeId, challengeId)` from `selectors.ts` — both keys are required. The archetype ID reaches the challenge UI through `LessonProvider` (`src/components/lesson/LessonContext.tsx`), not through a prop on `<DecisionChallenge />`.

## Validation Rules

`validateProgressState(data)` returns `{ valid: true, state }` or `{ valid: false, error }`. A document is rejected when:

1. It is not a plain object, or `app !== 'system-design-atlas'`.
2. `schemaVersion` is neither `1`, `2`, nor `3`.
3. `exportedAt` is present but not a parseable timestamp.
4. `preferences` is missing, `chatProvider` is not one of the three known providers, or `focusMode` is not a boolean.
5. `lastVisited` is neither `null` nor an object with string `archetypeId`/`stepId` and a valid `visitedAt`.
6. `archetypes` is not an object, or any entry has a non-string `lastStepId`, an invalid `updatedAt`, a non-object `steps`, or a step with invalid `visitedAt`/`completedAt`.
7. `challenges` is malformed for its schema version: a v3 document must nest archetype → challenge → progress, while a v1/v2 document must be a flat challenge → progress map. Every `ChallengeProgress` entry must carry a string `challengeId`, parseable `attemptedAt`/`completedAt`, a `null`-or-string `selectedOptionId`, a boolean `demonstratedUnderstanding`, and an undefined-or-string `notesDraft`.
8. `notes` (or its `archetypes`/`steps` sub-objects) is malformed, or any note value is not a string.

Timestamps are validated leniently: `null` is always allowed, and any string that `new Date(...)` can parse is accepted.

**Prototype-pollution guard:** archetype IDs, step IDs, challenge IDs, and note keys are rejected outright if they equal `__proto__` or `constructor`. This runs before any object is spread into state.

## Migration Policy

Migration happens inside the validator, not as a separate pass. Once a document validates, it is normalized to `schemaVersion: 3` and the optional collections are filled with safe defaults:

```typescript
{
  ...data,
  schemaVersion: 3,
  challenges: data.schemaVersion === 3
    ? normalizeNamespacedChallenges(data.challenges)   // rebuild clean, drop invalid entries
    : migrateFlatChallenges(data.challenges),          // wrap the flat map under 'url-shortener'
  decisionJournal: Array.isArray(data.decisionJournal) ? data.decisionJournal.filter(isDecisionJournalEntry) : [],
  notes: { archetypes: {...} | {}, steps: {...} | {} },
}
```

So a `schemaVersion: 1` document (which predates challenges, the decision journal, and notes) and a `schemaVersion: 2` document (flat challenge map) both load cleanly and are written back as version 3 on the next save. Legacy flat challenge progress is attributed to `url-shortener` (`LEGACY_CHALLENGE_ARCHETYPE_ID`), the only chapter that shipped challenges before v3. `migrateProgress()` in `migrations.ts` is the public wrapper used by `storage.ts` and the cross-tab handler: it returns the migrated state or `null` when validation fails. `yaml-transfer.ts` calls `validateProgressState` directly so it can surface the specific validation error to the user. When a future version 4 is introduced, add the conversion logic there and extend the `schemaVersion` union in `types.ts` — never drop support for reading an older version without a migration path.

## Synchronization & Merge Behavior

Merging is used for cross-tab sync and for the "merge" option during YAML import. It is dispatched as `MERGE_STATE` and handled in `reducer.ts`. The rules are deliberately asymmetric — timestamps that record *when learning happened* keep the earliest value, while pointers to *where the user is now* keep the latest:

| Field | Rule |
|---|---|
| `archetypes[id]` (new) | Taken wholesale from the imported document |
| `steps[stepId].visitedAt` | **Earliest** non-null wins |
| `steps[stepId].completedAt` | **Earliest** non-null wins |
| `archetypes[id].updatedAt` | **Latest** wins |
| `archetypes[id].lastStepId` | Follows whichever `updatedAt` won |
| `lastVisited` | **Latest** `visitedAt` wins |
| `challenges[archetypeId][id].attemptedAt` | **Earliest** wins |
| `challenges[archetypeId][id].demonstratedUnderstanding` | Logical **OR** of both |
| `challenges[archetypeId][id].completedAt` | Current value if set, else the imported one |
| `challenges[archetypeId][id].notesDraft` | Current value if set, else the imported one |
| `decisionJournal` | **Union by `id`**; existing entries win on conflict |
| `notes` (chapter and step) | See below |

Challenge merging is per chapter: an imported archetype ID absent locally is adopted wholesale, and only the challenge IDs present in both are reconciled by the rules above. Attempts are never lost — earliest attempt wins, understanding and completion are sticky, and the first non-empty notes draft is kept (`mergeChallengeProgress` in `reducer.ts`).

**Note merging:** if the local note is absent or blank, the imported note is adopted. If both exist and differ, they are concatenated with a `\n\n---\n\n` separator so neither version is silently lost. Identical notes are left untouched.

`preferences` are **not** merged — the local document's preferences always win, since they describe this device's UI rather than learning history.

### Replace Behavior

If the user explicitly chooses to overwrite during import, `REPLACE_STATE` swaps in the imported document wholesale. No merging occurs. `RESET` restores `initialState`.

## Export & Import

`yaml-transfer.ts` handles the YAML round-trip:

- `exportToYaml(state)` stamps `exportedAt` with the current ISO time and stringifies the whole document. The `yaml` package is dynamically imported so it stays out of the initial bundle.
- `importFromYaml(content, availableArchetypes)` rejects files over **1 MB**, parses with `maxAliasCount: 10` to blunt YAML alias bombs, then runs the same validator as storage reads — so an imported document is migrated and normalized exactly like a stored one.
- On success it returns an `ImportSummary` listing known vs. unknown archetype IDs and the total completed-step count. The toolbar shows this preview before the user commits to merge or replace.
- Unknown archetype IDs are reported but **not stripped**: the merged state keeps them, so importing a file from a newer build does not destroy progress for chapters this build has not registered yet.

## Cross-Tab Behavior

`ProgressProvider` registers a `storage` listener. When another tab writes the progress key (`STORAGE_KEY`, imported from `storage.ts` rather than repeated as a literal), this tab parses `e.newValue`, runs it through `migrateProgress`, and dispatches `REPLACE_STATE` with the result — last-write-wins at the document level. Invalid payloads are logged and ignored, leaving the current state untouched. Because both tabs write the complete document, an in-flight local edit can be overwritten; the merge path exists for imports rather than for concurrent tabs.

## Round-Trip Behavior

Exporting progress to YAML and immediately re-importing it with the merge strategy must be idempotent: earliest/latest selection over identical values is a no-op, journal union by `id` adds nothing, and identical notes are not concatenated. `exportedAt` is the only field expected to differ.

## Recovery from Corruption

If `localStorage` holds unparseable JSON or a document that fails validation, `loadProgress()` logs a warning and returns `null`, and the app starts from `initialState`. The application must never crash because of bad stored data, and must never write an unvalidated document back over data it could not read.

Lesson routes persist visits only after the matching chapter module and step have been validated. An obsolete saved resume ID falls back to the chapter’s first step; invalid deep links never overwrite a valid resume point.

Imported decision-journal entries must have string fields and a valid timestamp. Malformed entries are discarded while valid journal entries and other progress are retained.
