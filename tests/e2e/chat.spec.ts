import { test, expect } from '@playwright/test';
import { chatStepManifest } from '../../src/archetypes/chat/steps-manifest';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 375, height: 667 }]) {
  test(`chat content and diagrams at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const step of chatStepManifest) {
      await page.goto(`/archetypes/chat/steps/${step.id}`);
      await expect(page.getByRole('heading', { level: 1, name: step.title })).toBeVisible();
      const content = page.getByRole('complementary', { name: 'Step explanations and learning challenges' });
      await expect(content).toBeVisible();
      await expect(content.getByRole('heading', { level: 3 }).first()).toBeVisible();
      await expect(page.getByRole('region', { name: 'Architecture diagram visual stage' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (step.id === 'ordering' || step.id === 'resilience') {
        await page.screenshot({ path: `test-results/chat-${viewport.width}-${step.id}.png` });
      }
    }
    expect(errors).toEqual([]);
    await page.getByText('“The old owner wakes up after failover.”', { exact: true }).click();
    await expect(page.getByText(/The storage authority must reject its old epoch/)).toBeVisible();
  });
}

test('chat challenge retry, notes, progress, flows, and concept inspection survive navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/archetypes/chat/steps/ordering');
  await page.getByRole('radio', { name: /Generate a fresh ID on retry/ }).click();
  await page.getByRole('button', { name: /Simulate & Evaluate Decision/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sub-optimal' })).toBeVisible();
  await page.getByRole('button', { name: /Evaluate Another Option/ }).click();
  await page.getByRole('radio', { name: /Atomic durable deduplication/ }).click();
  await page.getByRole('button', { name: /Simulate & Evaluate Decision/ }).click();
  await expect(page.getByText('Optimal Architectural Decision')).toBeVisible();
  await page.getByRole('button', { name: /Mark step complete/ }).click();
  await page.getByRole('button', { name: /Study notes/i }).click();
  const notes = page.getByRole('dialog', { name: 'Study Notes' });
  await notes.getByRole('textbox').fill('Fence authority and verify the committed position separately.');
  await notes.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await expect(page.getByText('Optimal Architectural Decision')).toBeVisible();
  await expect(page.getByRole('button', { name: /Step completed/ })).toBeVisible();
  await page.keyboard.press('n');
  await expect(notes.getByRole('textbox')).toHaveValue('Fence authority and verify the committed position separately.');
  await notes.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('tab', { name: 'Gap recovery' }).click();
  await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
  await page.getByRole('button', { name: /Pause/i }).click();
  await page.getByRole('button', { name: 'Ordering', exact: true }).click();
  await expect(page.getByText('Message Ordering', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 5, y: 100 } });
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/chat\/steps\/reconnect$/);
  await page.goto('/archetypes/chat/steps/resilience');
  await page.getByRole('radio', { name: /Freeze, fence, and verify durability/ }).click();
  await page.getByRole('button', { name: /Simulate & Evaluate Decision/ }).click();
  await expect(page.getByText('Optimal Architectural Decision')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Resume/i }).first()).toHaveAttribute('href', '/archetypes/chat/steps/resilience');
});


test('all expanded chat steps are reachable in sequence through the outline and next controls', async ({ page }) => {
  await page.goto('/archetypes/chat');
  await expect(page).toHaveURL(/\/chat\/steps\/requirements$/);
  await page.getByRole('button', { name: 'Toggle outline' }).click();
  const outline = page.getByRole('navigation', { name: 'Chapter outline' });
  await expect(outline.getByRole('button')).toHaveCount(chatStepManifest.length);
  await outline.getByRole('button', { name: /Step 12 Recap/ }).click();
  await expect(page).toHaveURL(/\/chat\/steps\/recap$/);
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeDisabled();
  await page.goto('/archetypes/chat/steps/requirements');
  for (const step of chatStepManifest.slice(1)) {
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(page).toHaveURL(`/archetypes/chat/steps/${step.id}`);
    await expect(page.getByRole('heading', { level: 1, name: step.title })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Previous step', exact: true }).click();
  await expect(page).toHaveURL('/archetypes/chat/steps/tradeoffs');
});
