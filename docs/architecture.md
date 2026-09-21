# Architecture

This document describes the high-level architecture and design decisions for the System Design Atlas application.

## Overview

System Design Atlas is a purely client-side React application. It uses React 19, TypeScript, and Vite, with routing handled by React Router (hash routing). All state is kept locally within the browser, avoiding the need for any backend API or database. It allows users to read through step-by-step interactive lessons with associated system architecture diagrams, and saves their progress in `localStorage`.

## Folder Structure & Ownership

```
src/
  app/          — App entry, routing, global providers
  pages/        — Route-level page components that orchestrate features
  components/   — Reusable UI components (buttons, modals, layouts)
  archetypes/   — Chapter content. Each chapter is self-contained here.
  concepts/     — Shared concept definitions (databases, caches, etc.)
  features/     — Cross-cutting features (progress state, AI chat config)
  hooks/        — Shared custom hooks
  types/        — Global TypeScript types
  styles/       — Global CSS tokens and resets
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

We use hash-based routing (`/#/...`) via `createHashRouter` to ensure maximum compatibility with simple static file hosts (like GitHub Pages, S3, etc.) without requiring fallback redirects configuration.

**Route Patterns:**
- `/` - Home/Catalog
- `/chapter/:id` - Chapter learning interface
- `/chapter/:id/concept/:conceptId` - Deep-dive into a specific concept within a chapter context
- `/progress` - Progress management (export/import)

## Content Loading (Lazy Loading)

Chapters can be large, and loading them all on the home page would be bad for performance. 
We use a lazy-loading strategy. The application maintains two structures:
1. **Catalog (`src/archetypes/catalog.ts`)**: Contains lightweight metadata about all available and planned chapters. This is loaded synchronously to build the home page.
2. **Registry (`src/archetypes/registry.ts`)**: Maps chapter IDs to a dynamic `import()` of that chapter's lesson data and UI components. The chapter route lazy-loads these dependencies when the user navigates.

## State Management

Global state is minimal:
- **Progress Tracking**: Managed via React Context and a custom hook (`useProgress`). It handles loading, saving, and updating chapter completions.
- **UI State**: Managed via local component state (`useState`, `useReducer`) for things like diagram interactions and modal toggles.

## Progress Persistence

Progress is saved in the browser's `localStorage` under a versioned key (`sda_progress_v1`).
- **Debounced Saves**: Updates to progress are debounced to avoid thrashing `localStorage`.
- **Cross-tab Support**: A custom hook (`useLocalStorage`) listens to the `storage` event to sync progress across multiple open tabs of the app.
- **Export/Import**: Progress can be exported to a YAML file, downloaded by the user, and imported on another device.

## Diagram System

Diagrams are built using inline SVG elements rendered by React components. 
- A base diagram container sets the coordinate system.
- Nodes and edges are positioned via explicit `x`, `y` coordinates.
- Animations (e.g., request flows) are achieved using CSS animations on SVG elements (like moving dots or dashes along a path).
- Currently, this is a custom static layout. In the future, this could be replaced with React Flow if more dynamic or user-editable diagrams are needed.

## Chat Assistance

The application features AI Chat Assistance.
- It does not embed an LLM or use API keys.
- It generates contextual prompts based on the user's current chapter, step, and concept.
- These prompts are copied to the user's clipboard (or passed via URL params if supported) and an external tab is opened for chatbots like ChatGPT, Claude, or Gemini.

## Design System & Styling

- **CSS Modules**: All components use CSS modules for scoped styling (e.g., `Button.module.css`).
- **Design Tokens**: Global design tokens (colors, spacing, typography) are defined as CSS variables in `src/styles/tokens.css`.
- **Light Theme**: The application currently targets a single light theme.

## Accessibility Approach

- Semantic HTML is prioritized (`<button>`, `<dialog>`, etc.).
- Custom components have `aria-*` attributes (e.g., `aria-expanded`, `aria-label`).
- Focus management is required for modals and navigation flows.
- Visual cues must not rely solely on color.
