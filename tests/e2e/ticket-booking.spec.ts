import { test, expect } from '@playwright/test';
import { ticketBookingStepManifest } from '../../src/archetypes/ticket-booking/steps-manifest';

test('ticket booking publishes every step and persists a decision and completion', async ({ page }) => {
  for (const step of ticketBookingStepManifest) {
    await page.goto(`/archetypes/ticket-booking/steps/${step.id}`);
    await expect(page.getByRole('heading', { level: 1, name: step.title })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Defend the design', exact: true })).toBeVisible();
  }
  await page.goto('/archetypes/ticket-booking/steps/payments');
  await page.getByRole('radio', { name: /Preserve closure and schedule a refund/ }).click();
  await page.getByRole('button', { name: /Simulate & Evaluate/ }).click();
  await expect(page.getByText('Optimal Architectural Decision')).toBeVisible();
  await page.getByRole('button', { name: /Mark step complete/ }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Step completed/ })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Continue learning' })).toContainText('Ticket Booking');
});

for (const width of [1440, 1366, 390]) {
  test(`ticket booking layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
    for (const id of ['baseline', 'payments', 'tradeoffs']) {
      await page.goto(`/archetypes/ticket-booking/steps/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const flows = page.getByRole('tablist', { name: 'Architecture flows' });
      if (await flows.isVisible()) {
        const controls = await flows.boundingBox();
        const nodes = await page.locator('[data-node-id]').all();
        for (const node of nodes) {
          const bounds = await node.boundingBox();
          expect(bounds!.y).toBeGreaterThan(controls!.y + controls!.height);
        }
      }
    }
  });
}
