import { test, expect } from '@playwright/test';

test.describe('System Design Atlas - Core User Journey', () => {
  test('complete 11-step verification journey', async ({ page }) => {
    // 1. Open home
    await page.goto('/#/');
    await expect(page).toHaveTitle(/System Design Atlas/);
    await expect(page.getByRole('heading', { level: 1, name: 'System Design Atlas' })).toBeVisible();
    await expect(page.getByText('1 chapter available · 19 chapters planned')).toBeVisible();

    // Verify filters work
    await expect(page.getByText('Foundation & Core Applications')).toBeVisible();
    await page.getByRole('button', { name: /Planned/i }).click();
    await expect(page.getByRole('heading', { name: 'Product Catalog' })).toBeVisible();
    await page.getByRole('button', { name: /All/i }).click();

    // 2. Start URL shortener
    const startBtn = page.getByRole('link', { name: 'Start' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Should be at requirements step
    await page.waitForURL('/#/archetypes/url-shortener/steps/requirements');
    await expect(page.getByRole('heading', { level: 1, name: 'Requirements & Scale' })).toBeVisible();

    // 3. Complete two steps
    // Complete Step 1: Requirements
    const completeBtn1 = page.getByRole('button', { name: /Complete & Next/i });
    await expect(completeBtn1).toBeVisible();
    await completeBtn1.click();

    // Now on Step 2: API & Data Model
    await page.waitForURL('/#/archetypes/url-shortener/steps/api-data');
    await expect(page.getByRole('heading', { level: 1, name: 'API & Data Model' })).toBeVisible();
    
    // Complete Step 2
    const completeBtn2 = page.getByRole('button', { name: /Complete & Next/i });
    await expect(completeBtn2).toBeVisible();
    await completeBtn2.click();

    // Now on Step 3: Baseline Architecture
    await page.waitForURL('/#/archetypes/url-shortener/steps/baseline');
    await expect(page.getByRole('heading', { level: 1, name: 'Baseline Architecture' })).toBeVisible();

    // 4. Navigate to cache and open its concept panel
    await page.getByRole('button', { name: /Caching/i }).click();
    await page.waitForURL('/#/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    // Interactive CacheLoadExplorer should be visible and working
    await expect(page.getByText('Cache Load Explorer')).toBeVisible();
    await expect(page.getByText('Estimated DB Reads / sec (with cache):')).toBeVisible();

    // Open Cache concept panel via concept link
    const cacheConceptLink = page.getByRole('button', { name: 'cache', exact: true }).first();
    await cacheConceptLink.click();
    await expect(page).toHaveURL(/concept=cache/);
    await expect(page.getByRole('heading', { level: 2, name: 'Cache' }).first()).toBeVisible();
    await expect(page.getByText('Why this exists').first()).toBeVisible();
    await expect(page.getByText('Context in this Chapter').first()).toBeVisible();

    // 5. Refresh and verify the route and saved progress
    await page.reload();
    await expect(page).toHaveURL(/steps\/cache\?concept=cache/);
    await expect(page.getByRole('heading', { level: 2, name: 'Cache' }).first()).toBeVisible();

    // 6. Return home and verify Resume
    await page.getByRole('link', { name: /System Design Atlas/i }).click();
    await page.waitForURL('/#/');
    
    // Resume card should be visible
    const resumeSection = page.getByRole('region', { name: 'Continue learning' });
    await expect(resumeSection).toBeVisible();
    await expect(resumeSection.getByText('URL Shortener')).toBeVisible();
    await expect(resumeSection.getByText('Caching Layer')).toBeVisible();
    
    const resumeBtn = resumeSection.getByRole('link', { name: 'Resume' });
    await expect(resumeBtn).toBeVisible();

    // 7. Export YAML
    await page.getByRole('button', { name: /Data/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export YAML/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/system-design-progress-.*\.yaml/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 8. Reset with confirmation
    await page.getByRole('button', { name: /Data/i }).click();
    await page.getByRole('button', { name: /Reset Progress/i }).click();
    // Confirm dialog
    const resetDialog = page.getByRole('dialog', { name: 'Reset Progress' });
    await expect(resetDialog).toBeVisible();
    await resetDialog.getByRole('button', { name: 'Reset Progress' }).click();
    
    // After reset, resume section should be gone
    await expect(page.getByRole('region', { name: 'Continue learning' })).not.toBeVisible();

    // 9. Import the file and verify restoration
    await page.getByRole('button', { name: /Data/i }).click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Import YAML/i }).click();
    const fileChooser = await fileChooserPromise;
    if (downloadPath) {
      await fileChooser.setFiles(downloadPath);
    }
    
    // Import Preview dialog should appear
    const importDialog = page.getByRole('dialog', { name: 'Import Progress' });
    await expect(importDialog).toBeVisible();
    await expect(importDialog.getByText(/Found 1 known chapters/i)).toBeVisible();
    await importDialog.getByRole('button', { name: 'Replace' }).click();

    // Verified restored
    await expect(page.getByRole('region', { name: 'Continue learning' })).toBeVisible();
    await expect(resumeSection.getByText('Caching Layer')).toBeVisible();

    // 10. Select a chatbot and verify contextual prompt generation
    // Click Resume to go back to lesson
    await resumeBtn.click();
    await page.waitForURL('/#/archetypes/url-shortener/steps/cache');

    // Change chatbot to Claude
    const providerSelect = page.getByLabel('AI Assistant');
    await providerSelect.selectOption('claude');

    // Open Ask AI
    const askAiBtn = page.getByRole('button', { name: 'Ask AI' }).first();
    await askAiBtn.click();

    const aiDialog = page.getByRole('dialog', { name: 'Ask AI Assistant' });
    await expect(aiDialog).toBeVisible();
    
    const textarea = aiDialog.getByRole('textbox', { name: 'Generated prompt' });
    await expect(textarea).toBeVisible();
    const promptText = await textarea.inputValue();
    expect(promptText).toContain('URL Shortener');
    expect(promptText).toContain('Caching Layer');
    expect(promptText).toContain('Please explain this concept in simple, clear terms');

    // Test prompt actions in dialog
    await aiDialog.getByRole('button', { name: 'Show an example' }).click();
    await expect(textarea).toHaveValue(/Please provide a concrete, practical example/);

    await aiDialog.getByRole('button', { name: 'Close dialog' }).click();

    // 11. Check keyboard navigation
    // Next step with arrow right
    await page.keyboard.press('ArrowRight');
    await page.waitForURL('/#/archetypes/url-shortener/steps/scaling');
    await expect(page.getByRole('heading', { level: 1, name: 'Scaling the Service' })).toBeVisible();

    // Prev step with arrow left
    await page.keyboard.press('ArrowLeft');
    await page.waitForURL('/#/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    // 12. Check mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    // Outline button should be visible on mobile
    const outlineMenuBtn = page.getByLabel('Open outline');
    await expect(outlineMenuBtn).toBeVisible();
    await outlineMenuBtn.click();
    
    const mobileDrawer = page.getByRole('dialog', { name: 'Lesson Outline' });
    await expect(mobileDrawer).toBeVisible();
  });
});
