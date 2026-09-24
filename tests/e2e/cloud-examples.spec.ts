import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`cloud examples stay optional and preserve geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/archetypes/url-shortener/steps/scaling');
    const aws = page.getByRole('button', { name: 'Show AWS examples' });
    const gcp = page.getByRole('button', { name: 'Show GCP examples' });
    const nodes = page.locator('[data-node-id]');
    await expect(aws).toHaveAttribute('aria-pressed', 'false');
    await expect(nodes.locator('text').filter({ hasText: 'RDS PostgreSQL' })).toHaveCount(0);
    const geometry = () => nodes.evaluateAll(elements => elements.map(el => ({
      transform: el.getAttribute('transform'),
      box: el.querySelector('rect')?.getBoundingClientRect().toJSON(),
    })));
    const before = await geometry();
    const tech = page.getByRole('button', { name: 'Show Tech examples' });
    await tech.click();
    await expect(nodes.locator('text').filter({ hasText: /Envoy$/ })).toBeVisible();
    await expect(nodes.locator('text').filter({ hasText: /PostgreSQL$/ })).toBeVisible();
    expect(await geometry()).toEqual(before);
    expect(await nodes.locator('text').evaluateAll(elements =>
      elements.every(el => (el as SVGTextElement).getComputedTextLength() <= 112),
    )).toBe(true);
    await aws.click();
    await expect(tech).toHaveAttribute('aria-pressed', 'false');
    await expect(aws).toHaveAttribute('aria-pressed', 'true');
    await expect(nodes.locator('text').filter({ hasText: /RDS PostgreSQL$/ })).toBeVisible();
    expect(await geometry()).toEqual(before);
    expect(await nodes.locator('text').evaluateAll(elements =>
      elements.every(el => (el as SVGTextElement).getComputedTextLength() <= 112),
    )).toBe(true);
    await expect(page.locator('[data-node-id="client"] text')).toHaveCount(1);

    await gcp.focus();
    await page.keyboard.press('Enter');
    await expect(gcp).toHaveAttribute('aria-pressed', 'true');
    await expect(aws).toHaveAttribute('aria-pressed', 'false');
    await expect(nodes.locator('text').filter({ hasText: /Cloud SQL · PG$/ })).toBeVisible();
    expect(await geometry()).toEqual(before);
    expect(await nodes.locator('text').evaluateAll(elements =>
      elements.every(el => (el as SVGTextElement).getComputedTextLength() <= 112),
    )).toBe(true);
    const controls = await page.getByRole('group', { name: 'Implementation examples' }).boundingBox();
    const replica = await page.locator('[data-node-id="db-replica"]').boundingBox();
    expect(controls!.y).toBeGreaterThan(replica!.y + replica!.height);
    await page.screenshot({ path: `test-results/implementation-examples-${width}.png` });
    await gcp.click();
    await expect(gcp).toHaveAttribute('aria-pressed', 'false');
    await expect(nodes.locator('text').filter({ hasText: /Cloud SQL · PG$/ })).toHaveCount(0);

    await page.locator('[data-node-id="db-replica"]').click();
    await page.getByRole('button', { name: 'Inspect DB Replica specification' }).click();
    await expect(page.getByRole('heading', { name: 'Implementation examples' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GCP: Cloud SQL for PostgreSQL read replica' })).toHaveAttribute('href', 'https://docs.cloud.google.com/sql/docs/postgres/replication');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  });
}


for (const width of [1440, 1366, 390]) {
  test(`chat cloud examples cover every state at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
    for (const [step, mappedCount] of [['baseline', 2], ['ordering', 5], ['scaling', 6], ['resilience', 7]] as const) {
      await page.goto(`/archetypes/chat/steps/${step}`);
      const bar = page.getByRole('group', { name: 'Implementation examples' });
      const nodes = page.locator('[data-node-id]');
      const subtitles = nodes.locator('text').filter({ has: page.locator('title') });
      await expect(bar).toBeVisible();
      expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(28);
      await expect(subtitles).toHaveCount(0);
      const positions = () => nodes.evaluateAll(elements => elements.map(el => ({
        transform: el.getAttribute('transform'),
        box: el.querySelector('rect')?.getBoundingClientRect().toJSON(),
      })));
      const before = await positions();
      for (const provider of ['Tech', 'AWS', 'GCP']) {
        const toggle = page.getByRole('button', { name: `Show ${provider} examples` });
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(subtitles).toHaveCount(mappedCount);
        expect(await subtitles.evaluateAll(elements =>
          elements.every(el => (el as SVGTextElement).getComputedTextLength() <= 112),
        )).toBe(true);
        expect(await positions()).toEqual(before);
        await expect(page.locator('[data-node-id="sender"] text')).toHaveCount(1);
        await expect(page.locator('[data-node-id="recipient"] text')).toHaveCount(1);
        await toggle.press('Space');
        await expect(subtitles).toHaveCount(0);
      }
    }
    await page.getByRole('button', { name: 'Show AWS examples' }).click();
    await page.screenshot({ path: `test-results/chat-implementation-examples-${width}.png` });
    await page.locator('[data-node-id="store"]').click();
    await page.getByRole('button', { name: 'Inspect Message shard specification' }).click();
    await expect(page.getByRole('link', { name: 'Tech: PostgreSQL with synchronous AZ standby' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'AWS: RDS for PostgreSQL with Multi-AZ' })).toBeVisible();
    await expect(page.getByText(/The application still owns sharding and ownership epochs/).filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
