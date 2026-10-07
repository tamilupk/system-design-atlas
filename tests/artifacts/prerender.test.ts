import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { archetypeCatalog } from '../../src/archetypes/catalog';
import { chapterStepManifests } from '../../src/archetypes/step-manifests';
import { getAllConcepts } from '../../src/concepts/registry';
import { generateSitemap } from '../../scripts/prerender';
import { chatStepManifest } from '../../src/archetypes/chat/steps-manifest';

describe('Static Prerendering and SEO Generation', () => {
  const distDir = path.resolve(process.cwd(), 'dist');

  it('generates dist/index.html with valid title, canonical, and JSON-LD', () => {
    const homeHtmlPath = path.join(distDir, 'index.html');
    expect(fs.existsSync(homeHtmlPath)).toBe(true);

    const html = fs.readFileSync(homeHtmlPath, 'utf-8');
    expect(html).toContain('<title>System Design Atlas — Senior Engineering System Design Guide</title>');
    expect(html).toContain('<link rel="canonical" href="https://systemdesign.tamilarasu.dev/" />');
    expect(html).toContain('"@type": "WebSite"');
    expect(html).toContain('System Design Atlas');
  });

  it('generates dist/archetypes/url-shortener/index.html with TechArticle metadata', () => {
    const archHtmlPath = path.join(distDir, 'archetypes/url-shortener/index.html');
    expect(fs.existsSync(archHtmlPath)).toBe(true);

    const html = fs.readFileSync(archHtmlPath, 'utf-8');
    expect(html).toContain('URL Shortener System Design Architecture — System Design Atlas');
    expect(html).toContain('<link rel="canonical" href="https://systemdesign.tamilarasu.dev/archetypes/url-shortener" />');
    expect(html).toContain('"@type": "TechArticle"');
  });

  it('generates static HTML for all 9 steps with readable fallback content', () => {
    const stepIds = [
      'requirements',
      'api-data',
      'baseline',
      'id-generation',
      'cache',
      'scaling',
      'reliability',
      'tradeoffs',
      'recap',
    ];

    stepIds.forEach((stepId, idx) => {
      const stepHtmlPath = path.join(distDir, `archetypes/url-shortener/steps/${stepId}/index.html`);
      expect(fs.existsSync(stepHtmlPath)).toBe(true);

      const html = fs.readFileSync(stepHtmlPath, 'utf-8');
      expect(html).toContain(`<link rel="canonical" href="https://systemdesign.tamilarasu.dev/archetypes/url-shortener/steps/${stepId}" />`);
      expect(html).toContain(`Step ${idx + 1} of 9`);
      expect(html).toContain('System Design Atlas');
    });
  });

  it('prerenders every chat lesson body and includes its route in the sitemap', () => {
    const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf-8');
    const expectedContent: Record<string, string> = {
      requirements: '10M daily active users', 'api-data': 'client_message_id', baseline: 'Pause the movie',
      ordering: 'next_seq', reconnect: 'Close the history/live race', 'presence-receipts': 'stale disconnect',
      scaling: '2M concurrent', 'hot-room-fanout': 'A room is not an average', operations: '13.89M',
      resilience: 'Promotion is a protocol', tradeoffs: 'Five-year retention', recap: 'five-minute reconstruction',
    };
    chatStepManifest.forEach((step, index) => {
      const route = `/archetypes/chat/steps/${step.id}`;
      const html = fs.readFileSync(path.join(distDir, route, 'index.html'), 'utf-8');
      expect(html).toContain(expectedContent[step.id]);
      expect(html).toContain(`Step ${index + 1} of ${chatStepManifest.length}`);
      expect(sitemap).toContain(`${route}</loc>`);
    });
  });

  it('generates static HTML for all shared concepts with trade-offs and failure modes', () => {
    const conceptIds = ['cache', 'database-index', 'load-balancer', 'idempotency', 'message-ordering', 'transactional-outbox'];

    conceptIds.forEach(cId => {
      const conceptHtmlPath = path.join(distDir, `concepts/${cId}/index.html`);
      expect(fs.existsSync(conceptHtmlPath)).toBe(true);

      const html = fs.readFileSync(conceptHtmlPath, 'utf-8');
      expect(html).toContain(`<link rel="canonical" href="https://systemdesign.tamilarasu.dev/concepts/${cId}" />`);
      expect(html).toContain('Architectural Role');
      expect(html).toContain('In-Depth Explanation');
    });
  });

  it('lists exactly the published canonical destinations as valid XML', () => {
    const xml = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf-8');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    const locations = [...parsed.querySelectorAll('url > loc')].map(node => node.textContent!);
    const origin = 'https://systemdesign.tamilarasu.dev';
    const expected = [
      `${origin}/`,
      ...archetypeCatalog.filter(chapter => chapter.availability === 'available').flatMap(chapter =>
        chapterStepManifests[chapter.id]!.map(step => `${origin}/archetypes/${chapter.id}/steps/${step.id}`)),
      ...getAllConcepts().map(concept => `${origin}/concepts/${concept.id}`),
    ].sort();
    expect(locations).toEqual(expected);
    expect(new Set(locations).size).toBe(locations.length);
    expect(parsed.querySelector('lastmod, priority, changefreq')).toBeNull();
    for (const location of locations) {
      const url = new URL(location);
      expect(url.origin).toBe(origin);
      expect(url.search + url.hash).toBe('');
      const html = fs.readFileSync(path.join(distDir, url.pathname, 'index.html'), 'utf-8');
      const page = new DOMParser().parseFromString(html, 'text/html');
      expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(location);
      expect(page.querySelector('h1')?.textContent?.trim()).toBeTruthy();
    }
  });

  it('escapes XML, deduplicates destinations, and omits redirect entries', () => {
    const url = "https://systemdesign.tamilarasu.dev/concepts/a&b";
    const xml = generateSitemap([
      { canonicalUrl: url }, { canonicalUrl: url },
      { canonicalUrl: 'https://systemdesign.tamilarasu.dev/archetypes/chat', includeInSitemap: false },
    ]);
    expect(xml).toContain('a&amp;b</loc>');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect([...parsed.querySelectorAll('loc')].map(node => node.textContent)).toEqual([url]);
  });

  it('rejects noncanonical sitemap URLs', () => {
    for (const canonicalUrl of [
      'http://systemdesign.tamilarasu.dev/', 'https://example.com/',
      'https://systemdesign.tamilarasu.dev/?concept=cache',
      'https://systemdesign.tamilarasu.dev/#/archetypes/chat',
      'https://user:password@systemdesign.tamilarasu.dev/',
    ]) {
      expect(() => generateSitemap([{ canonicalUrl }])).toThrow('Invalid sitemap canonical URL');
    }
  });

  it('generates robots.txt referencing the sitemap', () => {
    const robotsPath = path.join(distDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const txt = fs.readFileSync(robotsPath, 'utf-8');
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).not.toMatch(/^Disallow:/m);
    expect(txt).not.toMatch(/^Crawl-delay:/m);
    expect(txt).toContain('Sitemap: https://systemdesign.tamilarasu.dev/sitemap.xml');
  });

  it('generates 404.html fallback for SPA hosting', () => {
    const notFoundPath = path.join(distDir, '404.html');
    expect(fs.existsSync(notFoundPath)).toBe(true);

    const html = fs.readFileSync(notFoundPath, 'utf-8');
    expect(html).toContain('Page Not Found');
  });
});
