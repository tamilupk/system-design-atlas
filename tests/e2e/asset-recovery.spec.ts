import { test, expect } from '@playwright/test';

test('a failed lazy route offers manual reload without a reload loop', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'System Design Atlas' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('asset-recovery-test', 'saved'));
  let entryRequests = 0;
  page.on('request', request => { if (request.isNavigationRequest()) entryRequests++; });
  await page.route('**/assets/LessonPage-*.js', route => route.abort());
  await page.locator('a[href="/archetypes/ticket-booking"]').filter({ hasText: 'Start' }).click();
  const heading = page.getByRole('heading', { name: 'Unable to load this page' });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
  expect(entryRequests).toBe(0);
  await page.unroute('**/assets/LessonPage-*.js');
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('heading', { name: 'The Last Two Seats', exact: true })).toBeVisible();
  expect(entryRequests).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('asset-recovery-test'))).toBe('saved');
});

test('a lazy stylesheet failure presents readable mobile recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.route('**/assets/LessonPage-*.css', route => route.abort());
  await page.locator('a[href="/archetypes/ticket-booking"]').filter({ hasText: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Unable to load this page' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to curriculum' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Return to curriculum' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'System Design Atlas' })).toBeVisible();
});
