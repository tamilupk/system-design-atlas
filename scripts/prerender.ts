import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { archetypeCatalog } from '../src/archetypes/catalog';
import { archetypeRegistry } from '../src/archetypes/registry';
import { chapterStepManifests } from '../src/archetypes/step-manifests';
import { loadValidatedChapters, type ChapterSources } from '../src/archetypes/load-validated';
import { buildConceptIndex } from '../src/archetypes/concept-index';
import { getAllConcepts } from '../src/concepts/registry';
import { ProgressContext } from '../src/features/progress/ProgressProvider';
import { initialState } from '../src/features/progress/reducer';
import { LessonProvider } from '../src/components/lesson/LessonContext';
import type { ArchetypeModule } from '../src/types/archetype';
import type { LessonStep } from '../src/types/lesson';
import type { ProgressAction } from '../src/features/progress/types';

const BASE_URL = 'https://systemdesign.tamilarasu.dev';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

interface RouteMeta {
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: object;
  fallbackHtml: string;
  changefreq?: string;
  priority?: string;
  /**
   * Extra stylesheets to link from `<head>`. Lesson pages server-render the
   * real step components, whose CSS-module classes live in lazily-loaded
   * chunks that the base template does not reference.
   */
  stylesheets?: string[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Every CSS asset emitted by `vite build`, as root-absolute hrefs.
 *
 * Server-rendered lesson markup carries CSS-module class names from chunks the
 * base template never links, so lesson pages link the full set. Browsers
 * deduplicate by URL, so this costs nothing extra once the app hydrates.
 */
function listStylesheetAssets(): string[] {
  const assetsDir = path.join(DIST_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) return [];
  return fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => `/assets/${file}`);
}

/**
 * Restores `<div id="root"></div>` so the template can be reused.
 *
 * The home route's output *is* `dist/index.html`, so without this a second
 * `npm run prerender` (without an intervening `vite build`) would nest every
 * page inside the previous run's home markup. The greedy match runs to the last
 * `</div>` before `</body>`, which is always the root container's own tag.
 */
function resetRootContainer(template: string): string {
  return template.replace(/<div id="root">[\s\S]*<\/div>\s*<\/body>/, '<div id="root"></div>\n  </body>');
}

export function buildHtml(template: string, meta: RouteMeta): string {
  // A standalone rerun starts from the generated home page. Replace managed tags.
  let html = template
    .replace(/<link\b[^>]*rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, '');

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // Replace or inject Description
  if (html.includes('<meta name="description"')) {
    html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(meta.description)}" />\n</head>`);
  }

  // Inject Canonical, OG, Twitter, and JSON-LD structured data into head
  const headTags = `
    <link rel="canonical" href="${meta.canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${meta.canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="System Design Atlas" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <script type="application/ld+json">
${JSON.stringify(meta.jsonLd, null, 2).replace(/</g, '\\u003c')}
    </script>
  `;
  html = html.replace('</head>', `${headTags}\n</head>`);

  // Link the stylesheets the server-rendered markup depends on
  const missingStyles = (meta.stylesheets ?? []).filter((href) => !html.includes(`href="${href}"`));
  if (missingStyles.length > 0) {
    const styleTags = missingStyles
      .map((href) => `    <link rel="stylesheet" crossorigin href="${href}" />`)
      .join('\n');
    html = html.replace('</head>', `${styleTags}\n</head>`);
  }

  // Inject fallback HTML inside #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">\n${meta.fallbackHtml}\n</div>`
  );

  return html;
}

/**
 * Renders a step's real component to static markup.
 *
 * This is the same content source the interactive app uses, so there is no
 * second SEO copy of a lesson to keep in sync. Progress is supplied as a
 * frozen initial state with a no-op dispatch and `storageAvailable: false`,
 * which keeps browser-only persistence and interactive state out of the
 * static output. `LessonProvider` supplies the chapter ID so namespaced
 * challenge state resolves exactly as it does at runtime.
 */
function renderStepBody(module: ArchetypeModule, step: LessonStep): string {
  const StepComponent = module.stepComponents[step.id];
  if (!StepComponent) throw new Error(`Missing component: ${module.metadata.id}/${step.id}`);

  const noopDispatch = (() => {}) as React.Dispatch<ProgressAction>;

  return renderToStaticMarkup(
    React.createElement(
      ProgressContext.Provider,
      { value: { state: initialState, dispatch: noopDispatch, storageAvailable: false } },
      React.createElement(
        LessonProvider,
        { archetypeId: module.metadata.id,
          children: React.createElement(StepComponent, { step, onConceptClick: () => {} }) }
      )
    )
  );
}

/**
 * Describes the diagram state a step teaches, straight from `diagrams.ts`.
 *
 * The interactive canvas is not meaningful without JavaScript, so the static
 * page spells out the nodes and request flows in text instead.
 */
function renderDiagramDescription(module: ArchetypeModule, step: LessonStep): string {
  if (!step.diagramStateId) return '';
  const state = module.diagrams.states[step.diagramStateId];
  if (!state) return '';

  const nodes = state.nodes
    .map((node) => {
      const responsibilities = node.spec?.responsibilities ?? [];
      return `
            <li style="margin-bottom: 0.75rem;">
              <strong>${escapeHtml(node.label)}</strong>
              <span style="color: #777; font-size: 0.85rem; text-transform: uppercase; margin-left: 0.5rem;">${escapeHtml(node.role)}</span>
              ${node.description ? `<p style="margin: 0.25rem 0 0 0; color: #444; line-height: 1.6;">${escapeHtml(node.description)}</p>` : ''}
              ${responsibilities.length > 0 ? `
                <ul style="margin: 0.35rem 0 0 0; padding-left: 1.25rem; color: #555; font-size: 0.9rem; line-height: 1.6;">
                  ${responsibilities.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
              ` : ''}
            </li>`;
    })
    .join('');

  const sequences = step.flowSequenceId
    ? state.flowSequences.filter((sequence) => sequence.id === step.flowSequenceId)
    : state.flowSequences;

  const flows = sequences
    .map((sequence) => `
          <section style="margin-top: 1.25rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0;">${escapeHtml(sequence.title)}</h3>
            <ol style="margin: 0.5rem 0 0 0; padding-left: 1.5rem; color: #333; line-height: 1.7;">
              ${sequence.events
                .map((event) => `<li><strong>${escapeHtml(event.label)}</strong>${event.description ? ` — ${escapeHtml(event.description)}` : ''}</li>`)
                .join('')}
            </ol>
          </section>`)
    .join('');

  if (!nodes && !flows) return '';

  return `
        <section style="margin-top: 2rem; padding: 1.25rem; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
          <h2 style="font-size: 1.35rem; font-weight: 700; margin-top: 0;">Architecture at this Step</h2>
          ${nodes ? `
            <ul style="list-style: none; margin: 0.75rem 0 0 0; padding: 0;">
              ${nodes}
            </ul>
          ` : ''}
          ${flows}
        </section>`;
}

/**
 * Builds every static route from the catalog and the archetype registry.
 *
 * Planned chapters are skipped entirely: they get no lesson pages and no
 * sitemap entries. Adding a chapter to the catalog and registry is enough —
 * this generator never needs editing.
 */
export async function generateRoutes(sources: ChapterSources = {
  catalog: archetypeCatalog, registry: archetypeRegistry, manifests: chapterStepManifests,
}): Promise<RouteMeta[]> {
  const { catalog: archetypeCatalog } = sources;
  const routes: RouteMeta[] = [];
  const allConcepts = getAllConcepts();
  const stylesheets = listStylesheetAssets();

  const chapters = await loadValidatedChapters(sources, allConcepts.map(concept => concept.id));
  const conceptChapters = buildConceptIndex(chapters);

  // 1. Home Route
  const homeFallback = `
    <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <header>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">System Design Atlas</h1>
        <p style="font-size: 1.125rem; color: #555; line-height: 1.6;">
          Interactive, production-grade system design curriculum for senior engineers (10+ YOE) targeting FAANG and tier-one product companies.
        </p>
      </header>

      <section style="margin-top: 2rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem;">Curriculum Chapters</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
          ${archetypeCatalog.map(arch => `
            <article style="border: 1px solid #ddd; border-radius: 8px; padding: 1.25rem; background: #fafafa;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <h3 style="margin: 0; font-size: 1.25rem;">
                  ${arch.availability === 'available'
                    ? `<a href="/archetypes/${arch.id}" style="color: #000; text-decoration: underline;">${escapeHtml(arch.title)}</a>`
                    : `${escapeHtml(arch.title)} <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #666;">Planned</span>`}
                </h3>
                <span style="font-size: 0.875rem; color: #777;">${arch.stage.toUpperCase()}${arch.estimatedMinutes ? ` · ${arch.estimatedMinutes} min` : ''}</span>
              </div>
              <p style="margin: 0.5rem 0 0 0; color: #444; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(arch.description)}</p>
              ${arch.availability === 'available' ? `
                <div style="margin-top: 0.75rem;">
                  <a href="/archetypes/${arch.id}" style="display: inline-block; padding: 6px 12px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.875rem; font-weight: 600;">
                    Start Chapter &rarr;
                  </a>
                </div>
              ` : ''}
            </article>
          `).join('')}
        </div>
      </section>

      <section style="margin-top: 2.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem;">Core Distributed System Concepts</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem;">
          ${allConcepts.map(c => `
            <a href="/concepts/${c.id}" style="padding: 8px 14px; border: 1px solid #ccc; border-radius: 6px; text-decoration: none; color: #222; background: #fff; font-size: 0.95rem; font-weight: 500;">
              ${escapeHtml(c.title)}
            </a>
          `).join('')}
        </div>
      </section>
    </main>
  `;

  routes.push({
    path: '',
    title: 'System Design Atlas — Senior Engineering System Design Guide',
    description: 'Learn system design through interactive lessons, real-time architecture diagrams, and senior engineering trade-offs. Master FAANG/Tier-1 interview archetypes.',
    canonicalUrl: `${BASE_URL}/`,
    changefreq: 'daily',
    priority: '1.0',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          url: `${BASE_URL}/`,
          name: 'System Design Atlas',
          description: 'Interactive system design curriculum for senior engineers targeting FAANG/Tier-1 interviews.',
          publisher: {
            '@type': 'Organization',
            name: 'System Design Atlas'
          }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${BASE_URL}/`
            }
          ]
        }
      ]
    },
    fallbackHtml: homeFallback
  });

  // 2. Chapter overview + step routes, one pair of loops per available chapter
  for (const chapter of chapters) {
    const { metadata, lesson } = chapter;
    const chapterPath = `archetypes/${metadata.id}`;
    const firstStep = lesson.steps[0];

    const overviewFallback = `
    <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <nav style="font-size: 0.875rem; margin-bottom: 1rem; color: #666;">
        <a href="/" style="color: #666; text-decoration: underline;">Atlas</a> /
        <span>${escapeHtml(metadata.title)}</span>
      </nav>

      <header>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">${escapeHtml(metadata.title)} System Design</h1>
        <p style="font-size: 1.125rem; color: #555; line-height: 1.6;">
          ${escapeHtml(metadata.description)}
        </p>
      </header>

      <section style="margin-top: 2rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem;">Lesson Steps</h2>
        <ol style="margin-top: 1rem; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          ${lesson.steps.map((step, idx) => `
            <li>
              <h3 style="margin: 0; font-size: 1.125rem;">
                <a href="/${chapterPath}/steps/${step.id}" style="color: #000; text-decoration: underline;">
                  Step ${idx + 1}: ${escapeHtml(step.title)}
                </a>
              </h3>
              <p style="margin: 0.25rem 0 0 0; color: #555; font-size: 0.95rem;">${escapeHtml(step.objective)}</p>
            </li>
          `).join('')}
        </ol>
      </section>

      ${firstStep ? `
      <div style="margin-top: 2rem;">
        <a href="/${chapterPath}/steps/${firstStep.id}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Start Lesson: ${escapeHtml(firstStep.title)} &rarr;
        </a>
      </div>
      ` : ''}
    </main>
  `;

    routes.push({
      path: chapterPath,
      title: `${metadata.title} System Design Architecture — System Design Atlas`,
      description: metadata.description,
      canonicalUrl: `${BASE_URL}/${chapterPath}`,
      changefreq: 'weekly',
      priority: '0.9',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: `${metadata.title} System Design Architecture`,
            description: metadata.description,
            url: `${BASE_URL}/${chapterPath}`
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: metadata.title, item: `${BASE_URL}/${chapterPath}` }
            ]
          }
        ]
      },
      fallbackHtml: overviewFallback
    });

    // 3. Step Routes
    lesson.steps.forEach((step, idx) => {
      const nextStep = lesson.steps[idx + 1];
      const prevStep = lesson.steps[idx - 1];
      const stepConcepts = step.concepts ?? [];

      const stepFallback = `
      <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <nav style="font-size: 0.875rem; margin-bottom: 1rem; color: #666;">
          <a href="/" style="color: #666; text-decoration: underline;">Atlas</a> /
          <a href="/${chapterPath}" style="color: #666; text-decoration: underline;">${escapeHtml(metadata.title)}</a> /
          <span>${escapeHtml(step.title)}</span>
        </nav>

        <header>
          <div style="font-size: 0.875rem; color: #777; font-weight: 600; text-transform: uppercase;">Step ${idx + 1} of ${lesson.steps.length}</div>
          <h1 style="font-size: 2rem; font-weight: 800; margin: 0.25rem 0 0.5rem 0;">${escapeHtml(step.title)}</h1>
          <p style="font-size: 1.1rem; color: #444; line-height: 1.6;">${escapeHtml(step.objective)}</p>
        </header>

        ${stepConcepts.length > 0 ? `
          <section style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
            <strong style="font-size: 0.9rem; color: #333;">Architectural Concepts in this Step:</strong>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
              ${stepConcepts.map(cId => {
                const conceptObj = allConcepts.find(c => c.id === cId);
                return `<a href="/concepts/${cId}" style="padding: 4px 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; color: #111; text-decoration: none;">${escapeHtml(conceptObj?.title || cId)}</a>`;
              }).join('')}
            </div>
          </section>
        ` : ''}

        <div style="margin-top: 2rem;">
          ${renderStepBody(chapter, step)}
        </div>

        ${renderDiagramDescription(chapter, step)}

        <nav style="margin-top: 2.5rem; display: flex; justify-content: space-between; border-top: 1px solid #eaeaea; padding-top: 1.5rem;">
          ${prevStep ? `
            <a href="/${chapterPath}/steps/${prevStep.id}" style="color: #000; text-decoration: underline; font-weight: 500;">
              &larr; Previous: ${escapeHtml(prevStep.title)}
            </a>
          ` : '<span></span>'}
          ${nextStep ? `
            <a href="/${chapterPath}/steps/${nextStep.id}" style="color: #000; text-decoration: underline; font-weight: 500;">
              Next: ${escapeHtml(nextStep.title)} &rarr;
            </a>
          ` : `
            <a href="/${chapterPath}" style="color: #000; text-decoration: underline; font-weight: 500;">
              Back to Overview &rarr;
            </a>
          `}
        </nav>
      </main>
    `;

      routes.push({
        path: `${chapterPath}/steps/${step.id}`,
        title: `${step.title} | ${metadata.title} System Design — System Design Atlas`,
        description: `Step ${idx + 1} of ${lesson.steps.length}: ${step.objective}. Senior system design engineering considerations, architectural trade-offs, and failure mode analysis.`,
        canonicalUrl: `${BASE_URL}/${chapterPath}/steps/${step.id}`,
        changefreq: 'weekly',
        priority: '0.8',
        stylesheets,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              headline: `${step.title} | ${metadata.title} System Design`,
              description: `Step ${idx + 1} of ${lesson.steps.length}: ${step.objective}`,
              url: `${BASE_URL}/${chapterPath}/steps/${step.id}`
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE_URL}/` },
                { '@type': 'ListItem', position: 2, name: metadata.title, item: `${BASE_URL}/${chapterPath}` },
                { '@type': 'ListItem', position: 3, name: step.title, item: `${BASE_URL}/${chapterPath}/steps/${step.id}` }
              ]
            }
          ]
        },
        fallbackHtml: stepFallback
      });
    });
  }

  // 4. Concept Routes — chapter-agnostic, aggregating every available chapter
  allConcepts.forEach(concept => {
    const appliedIn = conceptChapters.get(concept.id) ?? [];
    const conceptFallback = `
      <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <nav style="font-size: 0.875rem; margin-bottom: 1rem; color: #666;">
          <a href="/" style="color: #666; text-decoration: underline;">Atlas</a> /
          <span>Concepts</span> /
          <span>${escapeHtml(concept.title)}</span>
        </nav>

        <header>
          <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #555; text-transform: uppercase;">System Architecture Concept</span>
          <h1 style="font-size: 2.25rem; font-weight: 800; margin: 0.25rem 0 0.5rem 0;">${escapeHtml(concept.title)}</h1>
          <p style="font-size: 1.125rem; color: #444; line-height: 1.6;">${escapeHtml(concept.summary)}</p>
        </header>

        <section style="margin-top: 2rem;">
          <h2 style="font-size: 1.35rem; font-weight: 700;">Architectural Role</h2>
          <p style="color: #333; line-height: 1.7;">${escapeHtml(concept.role)}</p>
        </section>

        <section style="margin-top: 2rem;">
          <h2 style="font-size: 1.35rem; font-weight: 700;">In-Depth Explanation</h2>
          <p style="color: #333; line-height: 1.7; white-space: pre-line;">${escapeHtml(concept.explanation)}</p>
        </section>

        ${concept.tradeoffs.length > 0 ? `
          <section style="margin-top: 2rem;">
            <h2 style="font-size: 1.35rem; font-weight: 700;">Key Trade-offs</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.95rem;">
              <thead>
                <tr style="background: #f5f5f5; text-align: left;">
                  <th style="padding: 10px; border: 1px solid #ddd;">Aspect</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Pros</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Cons</th>
                </tr>
              </thead>
              <tbody>
                ${concept.tradeoffs.map(t => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${escapeHtml(t.aspect)}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: #166534;">${escapeHtml(t.pros)}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: #991b1b;">${escapeHtml(t.cons)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </section>
        ` : ''}

        ${concept.failureModes.length > 0 ? `
          <section style="margin-top: 2rem;">
            <h2 style="font-size: 1.35rem; font-weight: 700;">Production Failure Modes &amp; Edge Cases</h2>
            <ul style="padding-left: 1.5rem; margin-top: 0.5rem; color: #333; line-height: 1.6;">
              ${concept.failureModes.map(fm => `<li>${escapeHtml(fm)}</li>`).join('')}
            </ul>
          </section>
        ` : ''}

        ${appliedIn.length > 0 ? `
          <section style="margin-top: 2rem;">
            <h2 style="font-size: 1.35rem; font-weight: 700;">Applied in Archetypes</h2>
            ${appliedIn.map(({ metadata: chapterMeta, entry }) => `
              <article style="margin-top: 1rem; padding: 1.25rem; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
                <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">${escapeHtml(chapterMeta.title)}</h3>
                <p style="color: #444; line-height: 1.6; margin: 0.5rem 0 0 0;">${escapeHtml(entry.chapterRole)}</p>
                ${entry.specificConsiderations.length > 0 ? `
                  <ul style="padding-left: 1.25rem; margin: 0.75rem 0 0 0; color: #555; line-height: 1.6; font-size: 0.95rem;">
                    ${entry.specificConsiderations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                  </ul>
                ` : ''}
                ${entry.exampleData ? `
                  <pre style="margin: 0.75rem 0 0 0; padding: 0.75rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 0.85rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;">${escapeHtml(entry.exampleData)}</pre>
                ` : ''}
                <div style="margin-top: 0.75rem;">
                  <a href="/archetypes/${chapterMeta.id}" style="color: #000; text-decoration: underline; font-weight: 600;">Explore in ${escapeHtml(chapterMeta.title)} Lesson &rarr;</a>
                </div>
              </article>
            `).join('')}
          </section>
        ` : ''}
      </main>
    `;

    routes.push({
      path: `concepts/${concept.id}`,
      title: `${concept.title} Architecture Guide | System Design Atlas`,
      description: concept.summary,
      canonicalUrl: `${BASE_URL}/concepts/${concept.id}`,
      changefreq: 'monthly',
      priority: '0.8',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: `${concept.title} Architecture Guide`,
            description: concept.summary,
            url: `${BASE_URL}/concepts/${concept.id}`
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Concepts', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 3, name: concept.title, item: `${BASE_URL}/concepts/${concept.id}` }
            ]
          }
        ]
      },
      fallbackHtml: conceptFallback
    });
  });

  return routes;
}

function generateSitemap(routes: RouteMeta[]): string {
  const today = new Date().toISOString().split('T')[0];
  const entries = routes.map(r => `  <url>
    <loc>${r.canonicalUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq || 'weekly'}</changefreq>
    <priority>${r.priority || '0.7'}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
}

export async function prerender() {
  console.log('Starting static prerender and SEO generation...');

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Base template not found at ${TEMPLATE_PATH}. Run vite build first.`);
  }

  const template = resetRootContainer(fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
  const routes = await generateRoutes();

  // Build every page before writing any of them. The home route's output is
  // `dist/index.html`, which is also the template, so writing it first would
  // leave every later page with the home page's pre-filled #root.
  const pages = routes.map((route) => ({
    targetFile: path.join(route.path ? path.join(DIST_DIR, route.path) : DIST_DIR, 'index.html'),
    html: buildHtml(template, route)
  }));

  for (const page of pages) {
    fs.mkdirSync(path.dirname(page.targetFile), { recursive: true });
    fs.writeFileSync(page.targetFile, page.html, 'utf-8');
  }

  const generatedCount = pages.length;

  // Generate sitemap.xml
  const sitemap = generateSitemap(routes);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`Generated sitemap.xml with ${routes.length} URLs`);

  // Generate robots.txt
  const robots = generateRobotsTxt();
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots, 'utf-8');
  console.log('Generated robots.txt');

  // Generate 404.html (SPA fallback for static servers)
  const notFoundRoute: RouteMeta = {
    path: '404',
    title: 'Page Not Found | System Design Atlas',
    description: 'The page you requested could not be found.',
    canonicalUrl: `${BASE_URL}/404`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Page Not Found'
    },
    fallbackHtml: `
      <main style="max-width: 600px; margin: 4rem auto; text-align: center; font-family: sans-serif;">
        <h1>Page Not Found</h1>
        <p>The page you requested does not exist or has been moved.</p>
        <p><a href="/" style="color: #000; font-weight: bold;">Return to Atlas Curriculum</a></p>
      </main>
    `
  };
  const notFoundHtml = buildHtml(template, notFoundRoute);
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf-8');
  console.log('Generated 404.html fallback');

  console.log(`Successfully prerendered ${generatedCount} static HTML pages!`);
}
