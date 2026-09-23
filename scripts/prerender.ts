import fs from 'node:fs';
import path from 'node:path';
import { archetypeCatalog } from '../src/archetypes/catalog';
import { urlShortenerLesson } from '../src/archetypes/url-shortener/lesson';
import { getAllConcepts } from '../src/concepts/registry';
import { urlShortenerConceptContext } from '../src/archetypes/url-shortener/concept-context';

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
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml(template: string, meta: RouteMeta): string {
  let html = template;

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
${JSON.stringify(meta.jsonLd, null, 2)}
    </script>
  `;
  html = html.replace('</head>', `${headTags}\n</head>`);

  // Inject fallback HTML inside #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">\n${meta.fallbackHtml}\n</div>`
  );

  return html;
}

function generateRoutes(): RouteMeta[] {
  const routes: RouteMeta[] = [];
  const allConcepts = getAllConcepts();

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
                <span style="font-size: 0.875rem; color: #777;">${arch.stage.toUpperCase()} · ${arch.estimatedMinutes} min</span>
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

  // 2. Archetype Route: URL Shortener
  const urlShortenerMeta = archetypeCatalog.find(a => a.id === 'url-shortener');
  const urlShortenerFallback = `
    <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <nav style="font-size: 0.875rem; margin-bottom: 1rem; color: #666;">
        <a href="/" style="color: #666; text-decoration: underline;">Atlas</a> /
        <span>URL Shortener</span>
      </nav>

      <header>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem;">URL Shortener System Design</h1>
        <p style="font-size: 1.125rem; color: #555; line-height: 1.6;">
          ${escapeHtml(urlShortenerMeta?.description || 'Design a high-throughput, low-latency URL shortening service capable of handling billions of redirects.')}
        </p>
      </header>

      <section style="margin-top: 2rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem;">Lesson Steps</h2>
        <ol style="margin-top: 1rem; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          ${urlShortenerLesson.steps.map((step, idx) => `
            <li>
              <h3 style="margin: 0; font-size: 1.125rem;">
                <a href="/archetypes/url-shortener/steps/${step.id}" style="color: #000; text-decoration: underline;">
                  Step ${idx + 1}: ${escapeHtml(step.title)}
                </a>
              </h3>
              <p style="margin: 0.25rem 0 0 0; color: #555; font-size: 0.95rem;">${escapeHtml(step.objective)}</p>
            </li>
          `).join('')}
        </ol>
      </section>

      <div style="margin-top: 2rem;">
        <a href="/archetypes/url-shortener/steps/${urlShortenerLesson.steps[0]?.id}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Start Lesson: ${escapeHtml(urlShortenerLesson.steps[0]?.title || '')} &rarr;
        </a>
      </div>
    </main>
  `;

  routes.push({
    path: 'archetypes/url-shortener',
    title: 'URL Shortener System Design Architecture — System Design Atlas',
    description: 'End-to-end URL Shortener system design for senior engineers. High-throughput redirects, Base62 ID generation, cache-aside strategies, replication lag, and trade-offs.',
    canonicalUrl: `${BASE_URL}/archetypes/url-shortener`,
    changefreq: 'weekly',
    priority: '0.9',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TechArticle',
          headline: 'URL Shortener System Design Architecture',
          description: 'End-to-end URL Shortener system design for senior engineers. High-throughput redirects, Base62 ID generation, cache-aside strategies, replication lag, and trade-offs.',
          url: `${BASE_URL}/archetypes/url-shortener`
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'URL Shortener', item: `${BASE_URL}/archetypes/url-shortener` }
          ]
        }
      ]
    },
    fallbackHtml: urlShortenerFallback
  });

  // 3. Step Routes
  urlShortenerLesson.steps.forEach((step, idx) => {
    const nextStep = urlShortenerLesson.steps[idx + 1];
    const prevStep = urlShortenerLesson.steps[idx - 1];

    const stepFallback = `
      <main style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <nav style="font-size: 0.875rem; margin-bottom: 1rem; color: #666;">
          <a href="/" style="color: #666; text-decoration: underline;">Atlas</a> /
          <a href="/archetypes/url-shortener" style="color: #666; text-decoration: underline;">URL Shortener</a> /
          <span>${escapeHtml(step.title)}</span>
        </nav>

        <header>
          <div style="font-size: 0.875rem; color: #777; font-weight: 600; text-transform: uppercase;">Step ${idx + 1} of ${urlShortenerLesson.steps.length}</div>
          <h1 style="font-size: 2rem; font-weight: 800; margin: 0.25rem 0 0.5rem 0;">${escapeHtml(step.title)}</h1>
          <p style="font-size: 1.1rem; color: #444; line-height: 1.6;">${escapeHtml(step.objective)}</p>
        </header>

        ${step.concepts.length > 0 ? `
          <section style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
            <strong style="font-size: 0.9rem; color: #333;">Architectural Concepts in this Step:</strong>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              ${step.concepts.map(cId => {
                const conceptObj = allConcepts.find(c => c.id === cId);
                return `<a href="/concepts/${cId}" style="padding: 4px 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; color: #111; text-decoration: none;">${escapeHtml(conceptObj?.title || cId)}</a>`;
              }).join('')}
            </div>
          </section>
        ` : ''}

        <nav style="margin-top: 2.5rem; display: flex; justify-content: space-between; border-top: 1px solid #eaeaea; padding-top: 1.5rem;">
          ${prevStep ? `
            <a href="/archetypes/url-shortener/steps/${prevStep.id}" style="color: #000; text-decoration: underline; font-weight: 500;">
              &larr; Previous: ${escapeHtml(prevStep.title)}
            </a>
          ` : '<span></span>'}
          ${nextStep ? `
            <a href="/archetypes/url-shortener/steps/${nextStep.id}" style="color: #000; text-decoration: underline; font-weight: 500;">
              Next: ${escapeHtml(nextStep.title)} &rarr;
            </a>
          ` : `
            <a href="/archetypes/url-shortener" style="color: #000; text-decoration: underline; font-weight: 500;">
              Back to Overview &rarr;
            </a>
          `}
        </nav>
      </main>
    `;

    routes.push({
      path: `archetypes/url-shortener/steps/${step.id}`,
      title: `${step.title} | URL Shortener System Design — System Design Atlas`,
      description: `Step ${idx + 1} of ${urlShortenerLesson.steps.length}: ${step.objective}. Senior system design engineering considerations, architectural trade-offs, and failure mode analysis.`,
      canonicalUrl: `${BASE_URL}/archetypes/url-shortener/steps/${step.id}`,
      changefreq: 'weekly',
      priority: '0.8',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: `${step.title} | URL Shortener System Design`,
            description: `Step ${idx + 1} of ${urlShortenerLesson.steps.length}: ${step.objective}`,
            url: `${BASE_URL}/archetypes/url-shortener/steps/${step.id}`
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Atlas', item: `${BASE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'URL Shortener', item: `${BASE_URL}/archetypes/url-shortener` },
              { '@type': 'ListItem', position: 3, name: step.title, item: `${BASE_URL}/archetypes/url-shortener/steps/${step.id}` }
            ]
          }
        ]
      },
      fallbackHtml: stepFallback
    });
  });

  // 4. Concept Routes
  allConcepts.forEach(concept => {
    const context = urlShortenerConceptContext[concept.id];
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
            <h2 style="font-size: 1.35rem; font-weight: 700;">Production Failure Modes & Edge Cases</h2>
            <ul style="padding-left: 1.5rem; margin-top: 0.5rem; color: #333; line-height: 1.6;">
              ${concept.failureModes.map(fm => `<li>${escapeHtml(fm)}</li>`).join('')}
            </ul>
          </section>
        ` : ''}

        ${context ? `
          <section style="margin-top: 2rem; padding: 1.25rem; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
            <h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 0;">Applied in URL Shortener Case Study</h2>
            <p style="color: #444; line-height: 1.6;">${escapeHtml(context.chapterRole)}</p>
            <div style="margin-top: 0.75rem;">
              <a href="/archetypes/url-shortener" style="color: #000; text-decoration: underline; font-weight: 600;">Explore in URL Shortener Lesson &rarr;</a>
            </div>
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

export function prerender() {
  console.log('Starting static prerender and SEO generation...');

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Base template not found at ${TEMPLATE_PATH}. Run vite build first.`);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const routes = generateRoutes();

  let generatedCount = 0;

  for (const route of routes) {
    const html = buildHtml(template, route);
    const targetDir = route.path ? path.join(DIST_DIR, route.path) : DIST_DIR;
    const targetFile = path.join(targetDir, 'index.html');

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, html, 'utf-8');
    generatedCount++;
  }

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

// Run prerender if executed directly
prerender();
