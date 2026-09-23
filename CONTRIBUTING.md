# Contributing to System Design Atlas

Thank you for your interest in contributing to **System Design Atlas**! We welcome contributions ranging from adding new system design archetypes to fixing technical discrepancies and enhancing architecture diagrams.

---

## Code of Conduct & Pedagogical Goals

System Design Atlas targets **senior engineers (10+ years experience)** preparing for Staff/Principal system design interviews at tier-one tech companies.

All contributions must adhere to these pedagogical principles:
1. **Mathematical Grounding**: Real estimates (peak reads, working-set RAM, write IOPS, multi-year storage), never hand-wavy numbers.
2. **Failure Isolation**: Explicit distributed failure modes (split-brain, network partitions, replica lag, thundering herds).
3. **Decision-Driven**: Emphasize trade-offs and engineering compromises rather than "one right answer."
4. **Honest Content**: Planned chapters must be labeled as `planned`. Never fabricate incomplete lessons.

---

## Development Setup

### Prerequisites
- Node.js 20+
- npm 10+

### Clone & Install
```bash
git clone https://github.com/your-username/system-design-atlas.git
cd system-design-atlas
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Adding a New Chapter (Archetype)

We provide a complete prompt and component framework to make adding new chapters fast and consistent:

1. **Read the [Authoring & Building Guide](docs/authoring-archetypes.md)**: The single master guide containing the AI Master Prompt for ChatGPT/Claude, folder contracts, and registration checklist.
2. **Use Shared Building Blocks**:
   - Step UI: `@/components/lesson/StepComponents` (`<StepContent>`, `<StepSection>`, `<Callout>`, `<TradeoffTable>`, `<DecisionChallenge>`, `<CodeBlock>`).
   - Diagram Helpers: `@/utils/diagram-builder` (`createNode`, `createEdge`, `createDiagramState`).

---

## Verification & Testing

Before submitting a Pull Request, all automated checks must pass. CI runs these same commands in this order:

```bash
# 1. Type Checking
npm run typecheck

# 2. Lint (ESLint flat config, zero warnings allowed)
npm run lint

# 3. Unit Tests
npm test

# 4. Production Build & Static Prerender
npm run build

# 5. End-to-End Tests
npm run test:e2e
```

---

## Known Refactoring & Next Tasks

Tracked here so contributors and agents pick these up before adding new features:

1. **Make `src/pages/HomePage.tsx` chapter-agnostic.** It currently hard-codes `STEP_IDS` and `STEP_TITLES` maps for `'url-shortener'` only (kept lightweight on purpose so the home page never imports lesson UI). When a second chapter becomes available, replace these maps with step metadata sourced from the catalog or a lazy registry query, so new chapters don't require editing `HomePage.tsx`.
2. **Namespace challenge IDs in progress state.** `state.challenges` is a flat `Record<string, ChallengeProgress>` keyed by bare `challengeId`, so two chapters shipping the same challenge ID would collide. Before the second chapter lands, either prefix IDs (`url-shortener:cache-eviction-ttl`) or re-key the record as `[archetypeId][challengeId]` — with a schema migration for existing stored progress (see `docs/progress-format.md`).
3. **Generalize `scripts/prerender.ts`.** Route generation for chapter/step/concept pages currently hard-codes `url-shortener` and the four shipped concepts; it must iterate the catalog/registry when more chapters become available.
4. **Scaffold the next planned archetype.** The catalog (`src/archetypes/catalog.ts`) lists 19 planned chapters across the `foundation`, `advanced`, and `genai` stages — the next foundation entries are `product-catalog`, `photo-video`, and `notifications`. Follow `docs/authoring-archetypes.md` to scaffold one end-to-end.

---

## Folder Ownership Rules

```
src/components/        # Reusable UI components shared across the app
src/archetypes/<id>/   # Chapter-specific content, diagrams, steps, and challenges
src/concepts/          # Shared system design concepts (cache, load balancer, etc.)
src/features/          # Cross-cutting features (progress, chat assist)
src/types/             # Core TypeScript type definitions
src/pages/             # Route-level page components
src/utils/             # Pure helper utilities
```

- Chapters may import shared components, concepts, types, and feature APIs.
- Chapters must **not** import another chapter's private files.
- Shared components must **not** import chapter implementations.

---

## Pull Request Guidelines

1. Create a feature branch: `git checkout -b feature/rate-limiter-archetype`.
2. Commit with clear, descriptive commit messages.
3. Ensure all tests (`npm test` and `npm run test:e2e`) pass locally.
4. Open a Pull Request with a summary of changes and screenshots of new visual components or diagrams.
