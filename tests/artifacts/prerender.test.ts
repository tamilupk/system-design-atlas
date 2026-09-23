import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

  it('generates static HTML for all shared concepts with trade-offs and failure modes', () => {
    const conceptIds = ['cache', 'database-index', 'load-balancer', 'idempotency'];

    conceptIds.forEach(cId => {
      const conceptHtmlPath = path.join(distDir, `concepts/${cId}/index.html`);
      expect(fs.existsSync(conceptHtmlPath)).toBe(true);

      const html = fs.readFileSync(conceptHtmlPath, 'utf-8');
      expect(html).toContain(`<link rel="canonical" href="https://systemdesign.tamilarasu.dev/concepts/${cId}" />`);
      expect(html).toContain('Architectural Role');
      expect(html).toContain('In-Depth Explanation');
    });
  });

  it('generates sitemap.xml containing all canonical URLs', () => {
    const sitemapPath = path.join(distDir, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const xml = fs.readFileSync(sitemapPath, 'utf-8');
    expect(xml).toContain('<loc>https://systemdesign.tamilarasu.dev/</loc>');
    expect(xml).toContain('<loc>https://systemdesign.tamilarasu.dev/archetypes/url-shortener</loc>');
    expect(xml).toContain('<loc>https://systemdesign.tamilarasu.dev/archetypes/url-shortener/steps/requirements</loc>');
    expect(xml).toContain('<loc>https://systemdesign.tamilarasu.dev/concepts/cache</loc>');
  });

  it('generates robots.txt referencing the sitemap', () => {
    const robotsPath = path.join(distDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const txt = fs.readFileSync(robotsPath, 'utf-8');
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Sitemap: https://systemdesign.tamilarasu.dev/sitemap.xml');
  });

  it('generates 404.html fallback for SPA hosting', () => {
    const notFoundPath = path.join(distDir, '404.html');
    expect(fs.existsSync(notFoundPath)).toBe(true);

    const html = fs.readFileSync(notFoundPath, 'utf-8');
    expect(html).toContain('Page Not Found');
  });
});
