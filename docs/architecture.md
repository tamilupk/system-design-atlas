# Architecture

This document describes the high-level architecture and design decisions for the System Design Atlas application.

## Overview

System Design Atlas is a purely client-side React application. It uses React 19, TypeScript, and Vite, with routing handled by React Router (browser/history routing). All state is kept locally within the browser, avoiding the need for any backend API or database. It allows users to read through step-by-step interactive lessons with associated system architecture diagrams, and saves their progress in `localStorage`.

## Technology Stack

| Layer | Choice |
|---|---|
| UI | React 19.1, `lucide-react` icons |
| Language | TypeScript 5.8 — `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, target ES2022 |
| Routing | `react-router-dom` 7.6 (`createBrowserRouter`) |
| Build | Vite 6.3 + `@vitejs/plugin-react`; path alias `@/*` → `src/*` |
| Unit tests | Vitest 4.1 + Testing Library + jsdom |
| E2E tests | Playwright 1.63 (Chromium) |
| Lint | ESLint 9 + typescript-eslint recommended rules, run with `--max-warnings 0` |
| Serialization | `yaml` 2.7 for progress export/import |

`tsconfig.json` checks app code, tests, build scripts, and tooling configuration in one no-emit project.

CI (`.github/workflows/ci.yml`, Node 22) runs on every push and PR to `main` in this order:
`npm ci` → `typecheck` → `lint` → `test` → `build` (includes prerender) → `test:build` → `playwright install --with-deps chromium` → `test:e2e`.

## Folder Structure & Ownership

```
src/
  app/          — App entry, routing, global providers
  pages/        — Route-level page components that orchestrate features
  components/   — Reusable UI components, grouped by concern:
    challenge/    — Decision-challenge widget (Predict → Choose → Simulate → Explain → Retry)
    chat/         — AI prompt dialog and provider selector
    curriculum/   — Home-page catalog list and resume card
    diagrams/     — SVG canvas, nodes, edges, flow controls, inspector
    layout/       — App shell, top toolbar, toolbar context
    lesson/       — Shared step primitives (StepContent, Callout, TradeoffTable, CodeBlock…)
    notes/        — Study-notes dialog with step and chapter scopes
    ui/           — Buttons, dialogs, drawers, toasts
  archetypes/   — Chapter content. Each chapter is self-contained here.
  concepts/     — Shared concept definitions (databases, caches, etc.)
  features/     — Cross-cutting features (progress state, chat assist)
  hooks/        — Shared custom hooks (useProgress, useLessonNavigation)
  types/        — Global TypeScript types
  utils/        — Pure helpers (diagram-builder, base62)
  styles/       — Global CSS tokens and resets

scripts/        — Build-time tooling (prerender.ts)
tests/e2e/      — Playwright specs
```

**Rules:**
- `components` are genuinely reusable.
- `archetypes` hold all chapter-specific data (metadata, lessons, diagrams, custom steps).
- `pages` wrap views and interact with `features`.

## Dependency Direction

```
pages → components, features, archetypes (via registry)
components → types, hooks (never archetypes)
archetypes → components, concepts, types, features
concepts → types (never archetypes or components)
features → types (never components or archetypes)
```

## Routing Strategy

We use HTML5 history routing via `createBrowserRouter` (`src/app/router.tsx`) so URLs are real, shareable paths. Static hosts must be configured with an SPA fallback to `index.html`; the build step emits a `404.html` copy of the shell for hosts that serve it automatically.

**Route Patterns:**
- `/` — Home/catalog
- `/archetypes/:archetypeId` — Chapter overview (renders the first step)
- `/archetypes/:archetypeId/steps/:stepId` — Deep link into a specific step
- `/concepts/:conceptId` — Standalone deep-dive into a shared concept
- `*` — Not-found page

**Legacy hash redirect:** `RootLayout` runs a one-way effect that rewrites an incoming `#/...` hash to the equivalent path with `navigate(target, { replace: true })`. This keeps old bookmarks and previously shared hash URLs working. New links must never be generated in hash form.

All page components are `lazy()`-loaded behind a single `<Suspense>` boundary in `RootLayout`.

## Content Loading (Lazy Loading)

Chapters can be large, and loading them all on the home page would be bad for performance. 
We use a lazy-loading strategy. The application maintains two structures:
1. **Catalog (`src/archetypes/catalog.ts`)**: Contains lightweight metadata about all available and planned chapters. This is loaded synchronously to build the home page.
2. **Registry (`src/archetypes/registry.ts`)**: Maps chapter IDs to a dynamic `import()` of that chapter's lesson data and UI components. The chapter route lazy-loads these dependencies when the user navigates.

## State Management

Global state is minimal:
- **Progress Tracking**: A single `useReducer` store owned by `ProgressProvider` (`src/features/progress/`), consumed through the `useProgress` hook. All mutations go through named actions (`VISIT_STEP`, `COMPLETE_STEP`, `UNCOMPLETE_STEP`, `SAVE_CHALLENGE_ATTEMPT`, `SAVE_DECISION_ENTRY`, `SET_ARCHETYPE_NOTE`, `SET_STEP_NOTE`, `SET_CHAT_PROVIDER`, `SET_FOCUS_MODE`, `REPLACE_STATE`, `MERGE_STATE`, `RESET`). Derived values (percentages, resume point, overall counts) are computed by pure functions in `selectors.ts`, never stored.
- **Toolbar/UI State**: `ToolbarContext` (`src/components/layout/ToolbarContext.tsx`) lets the lesson page publish its navigation state up to the shared top toolbar. Everything else (diagram selection, modals, splitter width) is local component state.

## Progress Persistence

Progress is saved in `localStorage` under the versioned key `system-design-atlas-progress-v1` (defined in `src/features/progress/storage.ts`). See [progress-format.md](./progress-format.md) for the schema, validation, and merge rules.

- **Write-through Saves**: `ProgressProvider` persists the whole state in a `useEffect` on every state change. `saveProgress` swallows and logs write failures (quota, private mode) rather than throwing.
- **Availability Guard**: `isStorageAvailable()` probes `localStorage` with a write/remove round-trip; when it fails the app runs in-memory and surfaces `storageAvailable: false` so the UI can warn that progress will not persist.
- **Cross-tab Support**: `ProgressProvider` listens for the `storage` event, and when the key matches it validates the incoming JSON and dispatches `REPLACE_STATE`. Invalid payloads are logged and ignored.
- **Corruption Recovery**: `loadProgress()` validates on read; a corrupt or unknown-schema document is discarded (with a console warning) and the app starts from `initialState`.
- **Export/Import**: `yaml-transfer.ts` serializes progress to YAML for download and parses an imported file back through the same validator, then applies either replace or merge semantics.

## Build-Time Prerendering & SEO

`npm run build` is `tsc -b && vite build && vite-node scripts/prerender-cli.ts`. The prerender step post-processes `dist/` so every public route has real, crawlable HTML:

- Emits one `index.html` per route (currently 15: home, the `url-shortener` overview, its 9 steps, and the 4 concept pages) into path-shaped directories.
- Injects per-route `<title>`, meta description, canonical URL, Open Graph tags, and `TechArticle` + `BreadcrumbList` JSON-LD.
- Injects a static `fallbackHtml` payload inside `#root` so the page has readable content before hydration.
- Generates `sitemap.xml` (with `changefreq`/`priority` per route) and `robots.txt`.
- Copies the shell to `404.html` as the SPA fallback for static hosts.

Routes are derived from `archetypeCatalog`, the registry, the lesson definitions, and the concept registry, so new content is picked up automatically. The generator is chapter-agnostic: it iterates every `available` catalog entry, loads it through the registry, and emits its overview, step, and concept pages — adding a chapter to the catalog and registry is enough, the script never needs editing.

## Diagram System

Diagrams are hand-authored data rendered as inline SVG by React components in `src/components/diagrams/`. There is no layout engine and no third-party graph library — this is a deliberate choice so chapters ship deterministic, reviewable coordinates.

**Data model** (`src/types/diagram.ts`): a `DiagramState` holds `nodes`, `edges`, and `flowSequences`. Nodes carry explicit `x`/`y` plus a semantic `role` (`client`, `service`, `database`, `cache`, `loadbalancer`, `queue`, `external`) that drives styling. A `FlowSequence` is an ordered list of `FlowEvent`s, each naming the `edgeIds` to animate and the `highlightNodeIds` to emphasize. Chapters build these with the typed helpers in `src/utils/diagram-builder.ts` (`createNode`, `createEdge`, `createFlowEvent`, `createFlowSequence`, `createDiagramState`) rather than writing raw object literals.

**Components:**
- `ArchitectureDiagram` — the container. Owns zoom/pan, flow-sequence selection, the current event index, and the play state; computes the `viewBox`.
- `DiagramNode` / `DiagramEdge` — presentational SVG primitives.
- `FlowControls` — play/pause and step-through controls for the active sequence.
- `DiagramContextHUD` — contextual overlay for the selected node/flow.
- `NodeSpecPanel` — the inspector shown when a node is selected.

**Playback behavior:** when a sequence is playing, a `setInterval` advances one flow event every **1500 ms** and stops at the end of the sequence. A `flowRunId` counter forces a clean restart when the user replays or switches sequences.

**Flow tab bar:** the sequence selector is a floating pill bar (`height: 28px`) pinned to the top-left of the canvas. It scrolls horizontally when sequences overflow, and its scrollbar is suppressed across all engines (`scrollbar-width`, `-ms-overflow-style`, and `::-webkit-scrollbar` set to `display: none !important`) so the bar reads as a control strip rather than a scrollable region.

## Lesson Shell

`src/pages/LessonPage.tsx` is the chapter workspace: an SVG stage on the left, an explanation panel on the right, separated by a draggable splitter.

- **Splitter:** the explanation panel width is clamped to **260–750 px** (default 340), further capped at `window.innerWidth - 380` so the diagram always keeps usable space. The width persists to `localStorage` under `system-design-atlas-explanation-width`; double-click resets to the default. The handle is keyboard-operable and exposes `role="separator"` with `aria-valuemin`/`aria-valuemax`/`aria-valuenow`.
- **Keyboard shortcuts** (suppressed while focus is in an input, textarea, or select): `←`/`→` previous/next step, `M` or `C` toggle step completion, `B` toggle the chapter outline sidebar, `N` toggle the notes panel, `?` toggle the shortcut help, `Escape` close the inspector then clear the node selection.
- **Completion:** marking a step complete dispatches `COMPLETE_STEP`; the toggle is reversible via `UNCOMPLETE_STEP`. Progress percentages are always derived from the current lesson definition, so unknown or removed step IDs never count toward completion.

## Chat Assistance

The application features AI Chat Assistance (`src/features/chat-assist/`).
- It does not embed an LLM, call any model API, or use API keys.
- `build-prompt.ts` generates a contextual prompt from the user's current chapter, step, diagram state, and trade-offs.
- `providers.ts` defines the three supported targets and their prefill capability. This is the authoritative list — do not claim prefill for a provider that is not implemented here:

| Provider | Base URL | Prompt prefill |
|---|---|---|
| ChatGPT | `https://chatgpt.com/` | ✅ `?q=<encoded prompt>` |
| Claude | `https://claude.ai/new` | ✅ `?q=<encoded prompt>` |
| Gemini | `https://gemini.google.com/app` | ❌ no verified prefill param |

- The prompt is always copied to the clipboard first, so copy-paste is the guaranteed baseline. Prefill via URL is a convenience layered on top for the providers above; Gemini opens with an empty composer and the user pastes.

## Design System & Styling

- **CSS Modules**: All components use CSS modules for scoped styling (e.g., `Button.module.css`).
- **Design Tokens**: Global design tokens (colors, spacing, typography) are defined as CSS variables in `src/styles/tokens.css`.
- **Light Theme**: The application currently targets a single light theme.

## Accessibility Approach

- Semantic HTML is prioritized (`<button>`, `<dialog>`, etc.).
- Custom components have `aria-*` attributes (e.g., `aria-expanded`, `aria-label`).
- Focus management is required for modals and navigation flows.
- Visual cues must not rely solely on color.

Content validation runs before prerendering emits routes. Browser concept pages and prerendering share `buildConceptIndex`; concept pages lazy-load registered available chapters to build their case-study list. Unit tests need no build output; `npm run test:build` checks artifacts after building.
