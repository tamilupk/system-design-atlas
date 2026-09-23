import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import chapter from './fixtures/rate-limiter';
import { rateLimiterStepManifest as manifest } from './fixtures/rate-limiter/steps-manifest';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { initialState, progressReducer } from '@/features/progress/reducer';
import { loadProgress, saveProgress } from '@/features/progress/storage';
import { HomePage } from '@/pages/HomePage';
import { LessonPage } from '@/pages/LessonPage';
import { ConceptPage } from '@/pages/ConceptPage';
import { buildHtml, generateRoutes } from '../../../scripts/prerender';
import { loadValidatedChapters } from '../load-validated';
import { getAllConcepts } from '@/concepts/registry';
import { archetypeCatalog } from '../catalog';
import { archetypeRegistry } from '../registry';
import { chapterStepManifests } from '../step-manifests';

vi.mock('../catalog', async importOriginal => {
  const original = await importOriginal<typeof import('../catalog')>();
  const { default: fixture } = await import('./fixtures/rate-limiter');
  return { ...original, archetypeCatalog: [
    ...original.archetypeCatalog.filter(entry => entry.id !== fixture.metadata.id), fixture.metadata,
  ] };
});
vi.mock('../registry', async importOriginal => {
  const original = await importOriginal<typeof import('../registry')>();
  const registry = { ...original.archetypeRegistry,
    'rate-limiter': async () => (await import('./fixtures/rate-limiter')).default };
  return { archetypeRegistry: registry, isArchetypeAvailable: (id: string) => Object.hasOwn(registry, id) };
});
vi.mock('../step-manifests', async importOriginal => {
  const original = await importOriginal<typeof import('../step-manifests')>();
  const { rateLimiterStepManifest: steps } = await import('./fixtures/rate-limiter/steps-manifest');
  Object.assign(original.chapterStepManifests, { 'rate-limiter': steps });
  return original;
});

afterEach(() => { cleanup(); localStorage.clear(); });
const sources = () => ({ catalog: archetypeCatalog, registry: archetypeRegistry, manifests: chapterStepManifests });
const known = getAllConcepts().map(concept => concept.id);
function mount(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><ProgressProvider>
    <Link to="/">Home</Link>
    <Link to="/archetypes/rate-limiter/steps/missing">Invalid step</Link>
    <Link to="/archetypes/rate-limiter">Open chapter</Link>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/archetypes/:archetypeId" element={<LessonPage />} />
      <Route path="/archetypes/:archetypeId/steps/:stepId" element={<LessonPage />} />
      <Route path="/concepts/:conceptId" element={<ConceptPage />} />
    </Routes>
  </ProgressProvider></MemoryRouter>);
}

describe('second chapter authoring integration', () => {
  it('keeps executable examples identical to the authoring guide', () => {
    const doc = fs.readFileSync(path.resolve('docs/authoring-archetypes.md'), 'utf8');
    for (const [heading, file] of [['1.', 'metadata.ts'], ['2.', 'lesson.ts'], ['3.', 'challenges.ts'], ['4.', 'concept-context.ts'], ['5.', 'diagrams.ts'], ['6.', 'steps/AlgorithmStep.tsx'], ['7.', 'steps/index.ts'], ['8.', 'steps-manifest.ts'], ['9.', 'index.ts']]) {
      const section = doc.split(`### ${heading} \`src/archetypes/<id>/`)[1]!;
      const code = section.match(/```(?:typescript|tsx)\n([\s\S]*?)\n```/)![1];
      expect(fs.readFileSync(path.resolve(`src/archetypes/__tests__/fixtures/rate-limiter/${file}`), 'utf8').trim()).toBe(code!.trim());
    }
  });

  it('opens the registered second chapter through the real home and lesson shell', async () => {
    mount('/');
    const link = screen.getAllByRole('link', { name: 'Start' }).find(link => link.getAttribute('href') === '/archetypes/rate-limiter')!;
    fireEvent.click(link);
    expect(await screen.findByRole('heading', { name: 'Token Bucket vs Sliding Window Log' })).toBeVisible();
    await waitFor(() => expect(loadProgress()?.lastVisited).toMatchObject({ archetypeId: chapter.metadata.id, stepId: manifest[0]!.id }));
    expect(screen.getByRole('region', { name: 'Architecture diagram visual stage' })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: /Centralized Redis Cluster/ }));
    fireEvent.click(screen.getByRole('button', { name: /Simulate & Evaluate/ }));
    await waitFor(() => expect(loadProgress()?.challenges?.['rate-limiter']?.['storage-strategy']?.selectedOptionId).toBe('opt-central-redis'));
    expect(loadProgress()?.challenges?.['url-shortener']).toBeUndefined();
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(within(screen.getByRole('region', { name: 'Continue learning' })).getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/archetypes/rate-limiter/steps/algorithm');
  });

  it('does not replace valid progress with an invalid deep link', async () => {
    mount('/archetypes/rate-limiter');
    await screen.findByRole('heading', { name: 'Token Bucket vs Sliding Window Log' });
    await waitFor(() => expect(loadProgress()?.lastVisited?.stepId).toBe('algorithm'));
    fireEvent.click(screen.getByRole('link', { name: 'Invalid step' }));
    await screen.findByText(/Unable to locate this step/i);
    expect(loadProgress()?.lastVisited?.stepId).toBe('algorithm');
    fireEvent.click(screen.getByRole('link', { name: 'Open chapter' }));
    expect(await screen.findByRole('heading', { name: 'Token Bucket vs Sliding Window Log' })).toBeVisible();
  });

  it('falls back to the first valid step when a saved step was removed', async () => {
    saveProgress(progressReducer(initialState, { type: 'VISIT_STEP', archetypeId: 'rate-limiter', stepId: 'removed', timestamp: new Date().toISOString() }));
    mount('/archetypes/rate-limiter');
    expect(await screen.findByRole('heading', { name: 'Token Bucket vs Sliding Window Log' })).toBeVisible();
    await waitFor(() => expect(loadProgress()?.lastVisited?.stepId).toBe('algorithm'));
  });

  it('shows both chapters on the shared concept page', async () => {
    mount('/concepts/cache');
    expect(await screen.findByRole('link', { name: /Distributed Rate Limiter Case Study/ })).toHaveAttribute('href', '/archetypes/rate-limiter');
    expect(screen.getByRole('link', { name: /URL Shortener Case Study/ })).toBeVisible();
  });

  it('prerenders the second chapter, real step content, and concept associations', async () => {
    const routes = await generateRoutes(sources());
    expect(routes.find(route => route.path === '')?.fallbackHtml).toContain('/archetypes/rate-limiter');
    const step = routes.find(route => route.path === 'archetypes/rate-limiter/steps/algorithm');
    expect(step?.fallbackHtml).toContain('Token Bucket vs Sliding Window Log');
    expect(step?.canonicalUrl).toContain('/archetypes/rate-limiter/steps/algorithm');
    expect(routes.find(route => route.path === 'concepts/cache')?.fallbackHtml).toContain('Distributed Rate Limiter');
  });

  it('rejects missing loaders and manifests before generating routes', async () => {
    await expect(generateRoutes({ ...sources(), registry: {} })).rejects.toThrow('catalog/available-unregistered');
    await expect(generateRoutes({ ...sources(), manifests: {} })).rejects.toThrow('catalog/manifest-missing');
  });

  it('rejects broken step references, components, and loader failures', async () => {
    const one = { catalog: [chapter.metadata], manifests: { 'rate-limiter': manifest } };
    for (const broken of [
      { ...chapter, stepComponents: {} },
      { ...chapter, lesson: { ...chapter.lesson, steps: [{ ...chapter.lesson.steps[0]!, diagramStateId: 'missing' }] } },
    ]) {
      await expect(loadValidatedChapters({ ...one, registry: { 'rate-limiter': async () => broken } }, known)).rejects.toThrow('Invalid archetype "rate-limiter"');
    }
    await expect(loadValidatedChapters({ ...one, registry: { 'rate-limiter': async () => { throw new Error('broken import'); } } }, known)).rejects.toThrow('broken import');
  });
});


it('replaces SEO metadata on repeated prerenders and escapes JSON-LD script delimiters', async () => {
  const routes = await generateRoutes(sources());
  const home = routes.find(route => route.path === '')!;
  const step = routes.find(route => route.path === 'archetypes/rate-limiter/steps/algorithm')!;
  const template = '<html><head><title>Atlas</title></head><body><div id="root"></div></body></html>';
  const html = buildHtml(buildHtml(template, home), { ...step, jsonLd: { name: '</script><script>bad()</script>' } });
  expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  expect(html.match(/property="og:title"/g)).toHaveLength(1);
  expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(1);
  expect(html).toContain(step.canonicalUrl);
  expect(html).not.toContain('<script>bad()');
});
