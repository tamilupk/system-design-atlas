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
- Node.js 22 (matching CI)
- npm 10+

### Clone & Install
```bash
# Clone your fork, then change into its directory.
npm ci
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

# 5. Generated HTML checks
npm run test:build

# 6. End-to-End Tests (install Chromium once)
npx playwright install chromium
npm run test:e2e
```

---

## Known Refactoring & Next Tasks

Tracked here so contributors and agents pick these up before adding new features:

1. Add reviewed curriculum content for the planned chapters using the authoring guide.
2. Keep reference steps moving toward shared primitives when changing them; do not copy remaining chapter-private styles into new chapters.
3. Consider extracting focused hooks/components from the large lesson page when changing its behavior. Preserve its existing UI and regression coverage.

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
