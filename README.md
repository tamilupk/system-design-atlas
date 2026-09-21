# System Design Atlas

An interactive learning experience for system design, built with React, TypeScript, and Vite.

## Features

- **Interactive Lessons**: Step-by-step system design walkthroughs with architecture diagrams
- **Clickable Architecture Diagrams**: SVG-based diagrams with animated request flows
- **Concept Exploration**: Deep-dive into components like caches, load balancers, and database indexes
- **Progress Tracking**: Persistent local progress with YAML export/import
- **AI Assistance**: Contextual prompts for ChatGPT, Claude, and Gemini
- **Responsive Design**: Works on desktop and mobile

## Available Content

- ✅ URL Shortener (9 interactive steps)
- 📋 19 additional chapters planned

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Run tests
npm test
```

## Static Hosting

This application uses hash-based routing (`/#/...`), making it compatible with any static file host without server-side configuration.

```bash
npm run build
# Deploy the `dist/` folder to any static host
```

## Technology

- **React 19** with TypeScript (strict mode)
- **Vite 6** for development and building
- **React Router 7** with hash-based routing
- **CSS Modules** with global design tokens
- **Lucide React** for icons
- **YAML** for progress export/import

## Project Structure

```
src/
  app/          — App entry, routing, providers
  pages/        — Route-level page components
  components/   — Reusable UI components
  archetypes/   — Chapter content (one folder per chapter)
  concepts/     — Shared concept definitions
  features/     — Cross-cutting features (progress, chat)
  hooks/        — Shared custom hooks
  types/        — TypeScript type definitions
  styles/       — Global CSS and design tokens
```

See `docs/architecture.md` for detailed architecture documentation.

## Progress & Data

- Progress is stored in `localStorage` under a versioned key.
- Progress is specific to this browser and origin.
- Export/import progress as YAML files.
- See `docs/progress-format.md` for schema details.

## Limitations

- Only the URL Shortener chapter is currently available.
- No backend or API — all state is local.
- AI assistance opens external chatbots (no API keys required).
- No dark theme (light theme only).
- No syntax highlighting in code blocks.

## Documentation

- `AGENTS.md` — Instructions for AI coding agents
- `docs/architecture.md` — System architecture and design decisions
- `docs/authoring-archetypes.md` — How to add new chapters
- `docs/progress-format.md` — Progress data schema and behavior
