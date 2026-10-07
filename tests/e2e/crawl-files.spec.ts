import { test, expect } from '@playwright/test';

test('production serves crawler files rather than the SPA fallback', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  expect(xml).toContain('/archetypes/ticket-booking/steps/requirements</loc>');
  expect(xml).not.toContain('<html');
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain('Sitemap: https://systemdesign.tamilarasu.dev/sitemap.xml');
  expect(await robots.text()).not.toContain('<html');
});
