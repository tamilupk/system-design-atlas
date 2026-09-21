# AGENTS.md — System Design Atlas

This file provides instructions for AI coding agents working on this project.

## Before Making Changes

1. Read `docs/architecture.md` to understand the project structure and dependency rules.
2. Read `docs/authoring-archetypes.md` before adding or modifying chapters.
3. Read `docs/progress-format.md` before changing the progress/state system.

## Folder Ownership Rules

- `src/components/` — Genuinely reusable UI components shared across the application.
- `src/archetypes/<id>/` — Everything specific to one chapter: metadata, lesson definition, diagram data, step components, chapter-specific UI, concept contexts, and tests.
- `src/concepts/` — Shared concept definitions used across multiple chapters.
- `src/features/` — Cross-cutting features (progress persistence, chat assistance).
- `src/types/` — Shared TypeScript type definitions.
- `src/pages/` — Route-level page components (thin wrappers that compose features).
- `src/hooks/` — Shared custom hooks.

## Dependency Direction

```
pages → components, features, archetypes (via registry)
components → types, hooks (never archetypes)
archetypes → components, concepts, types, features
concepts → types (never archetypes or components)
features → types (never components or archetypes)
```

- Chapters may import shared components, concepts, types, and feature APIs.
- Chapters must NOT import another chapter's private files.
- Shared components must NOT import chapter implementations.
- Generic pages render chapters through the registry, not direct imports.

## Key Principles

- **Stable IDs:** All archetype, step, concept, and diagram node IDs must be stable semantic strings. Never use array positions as identifiers.
- **Lazy Loading:** Chapter content (step components) must be lazy-loaded. The home page must not eagerly import every lesson.
- **Progress Safety:** Never break persisted progress. Add schema migrations when the progress format changes. Never count unknown IDs toward completion.
- **Design Tokens:** Use CSS custom properties from `src/styles/tokens.css`. Do not hardcode colors, spacing, or typography values.
- **Accessibility:** Maintain semantic HTML, ARIA labels, keyboard navigation, and focus management. Test with screen readers.
- **Honest Content:** Planned chapters must be clearly labeled. Never fabricate completed lessons or imply functionality that doesn't exist.
- **Chat Integrity:** Never fabricate chatbot URL capabilities. The baseline is copy-paste. Only enable prefilling when verified.
- **Separation of Concerns:** Keep shared concept knowledge in `src/concepts/`. Keep chapter-specific context in the archetype's `concept-context.ts`.

## Adding a New Chapter

1. Create `src/archetypes/<chapter-id>/` with: `index.ts`, `metadata.ts`, `lesson.ts`, `diagrams.ts`, `concept-context.ts`, and a `steps/` folder.
2. Add metadata to `src/archetypes/catalog.ts` (change availability from 'planned' to 'available').
3. Add the lazy loader to `src/archetypes/registry.ts`.
4. Create step components in the `steps/` folder.
5. Reuse existing `LessonPlayer`, `ArchitectureDiagram`, and progress infrastructure.
6. Update `docs/authoring-archetypes.md` if the process changes.

## After Making Changes

- Run `npm run typecheck` to verify TypeScript.
- Run `npm run build` to verify the production build.
- Run `npm test` to run unit tests.
- Update documentation if architecture or contracts changed.
- Verify the UI renders correctly at desktop and mobile sizes.
