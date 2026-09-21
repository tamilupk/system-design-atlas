# Authoring Archetypes (Chapters)

This guide explains how to add a new chapter (archetype) to the System Design Atlas.

## 1. Create Folder Structure

Create a new folder in `src/archetypes/` named after the chapter ID (e.g., `src/archetypes/my-chapter/`).

Inside, create the following files:
```
src/archetypes/my-chapter/
  index.ts           # Exports the chapter implementation
  metadata.ts        # Chapter metadata (title, description, tags)
  lesson.ts          # Step definitions
  diagrams.ts        # Diagram node and edge definitions
  concept-context.ts # Specific explanations of generic concepts
  steps/             # UI components for each step
    Step1.tsx
    Step2.tsx
```

## 2. Define Metadata

In `metadata.ts`, export a `ChapterMetadata` object:

```typescript
import { ChapterMetadata } from '@/types/chapter';

export const metadata: ChapterMetadata = {
  id: 'my-chapter',
  title: 'My Chapter Title',
  description: 'A brief description of this chapter.',
  difficulty: 'beginner',
  estimatedMinutes: 10,
  tags: ['backend', 'database'],
  status: 'available',
};
```

## 3. Define Lesson Steps

In `lesson.ts`, define the steps for the chapter. Use stable IDs!

```typescript
import { Lesson } from '@/types/chapter';

export const lesson: Lesson = {
  id: 'my-chapter-lesson',
  title: 'My Chapter Lesson',
  steps: [
    { id: 'intro', title: 'Introduction' },
    { id: 'add-db', title: 'Adding a Database' }
  ]
};
```

## 4. Create Diagram States

In `diagrams.ts`, define what the diagram looks like at each step.

```typescript
// Define nodes, edges, and a record mapping step IDs to diagram states
export const diagrams = {
  'intro': { nodes: [...], edges: [...] },
  'add-db': { nodes: [...], edges: [...] },
};
```

## 5. Create Concept Contexts

In `concept-context.ts`, provide chapter-specific context for shared concepts.

```typescript
export const conceptContext = {
  'database': {
    chapterContext: 'In this chapter, we use a relational database to store user info.',
    relatedStepId: 'add-db'
  }
};
```

## 6. Build Step Components

Create step components in `steps/`. These are the actual UI rendered for each step.

```tsx
// steps/Step1.tsx
import React from 'react';

export const Step1: React.FC = () => (
  <div>
    <h2>Introduction</h2>
    <p>Welcome to this chapter.</p>
  </div>
);
```

## 7. Export the Implementation

In `index.ts`:

```typescript
import { metadata } from './metadata';
import { lesson } from './lesson';
import { diagrams } from './diagrams';
import { conceptContext } from './concept-context';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';

export const chapterImplementation = {
  metadata,
  lesson,
  diagrams,
  conceptContext,
  components: {
    'intro': Step1,
    'add-db': Step2,
  }
};
```

## 8. Register the Chapter

1. Add it to `src/archetypes/catalog.ts`. Make sure `status` is `'available'`.
2. Add a lazy import in `src/archetypes/registry.ts`:

```typescript
export const chapterRegistry = {
  // ... existing chapters
  'my-chapter': () => import('./my-chapter').then(m => m.chapterImplementation),
};
```
