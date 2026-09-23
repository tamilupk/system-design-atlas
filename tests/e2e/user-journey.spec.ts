import { test, expect } from '@playwright/test';

test.describe('System Design Atlas - Core User Journey', () => {
  test('complete verification journey with canonical URLs, decoupled progress, and decision challenges', async ({ page }) => {
    // 1. Open home
    await page.goto('/');
    await expect(page).toHaveTitle(/System Design Atlas/);
    await expect(page.getByRole('heading', { level: 1, name: 'System Design Atlas' })).toBeVisible();
    await expect(page.getByText('2 chapters available · 18 chapters planned')).toBeVisible();

    // Verify filters work
    await expect(page.getByText('Foundation & Core Applications')).toBeVisible();
    await page.getByRole('button', { name: /Planned/i }).click();
    await expect(page.getByRole('heading', { name: 'Product Catalog' })).toBeVisible();
    await page.getByRole('button', { name: /All/i }).click();

    // 2. Start URL shortener
    const startBtn = page.locator('a[href="/archetypes/url-shortener"]').filter({ hasText: 'Start' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Should be at requirements step with canonical real path
    await page.waitForURL('/archetypes/url-shortener/steps/requirements');
    await expect(page.getByRole('heading', { level: 1, name: 'Requirements & Scale' })).toBeVisible();

    // 3. Test decoupled Mark Complete vs Directional Navigation
    // Mark Step 1 complete without auto-advancing
    const markCompleteBtn1 = page.getByRole('button', { name: /Mark step complete/i });
    await expect(markCompleteBtn1).toBeVisible();
    await markCompleteBtn1.click();
    await expect(page.getByRole('button', { name: /Step completed/i })).toBeVisible();
    // Still on requirements step
    await expect(page).toHaveURL('/archetypes/url-shortener/steps/requirements');

    // Click Next to advance
    const nextBtn = page.getByRole('navigation', { name: 'Step navigation' }).getByRole('button', { name: /Next/i });
    await nextBtn.click();

    // Now on Step 2: API & Data Model
    await page.waitForURL('/archetypes/url-shortener/steps/api-data');
    await expect(page.getByRole('heading', { level: 1, name: 'API & Data Model' })).toBeVisible();
    
    // Mark Step 2 complete and advance
    await page.getByRole('button', { name: /Mark step complete/i }).click();
    await nextBtn.click();

    // Now on Step 3: Baseline Architecture
    await page.waitForURL('/archetypes/url-shortener/steps/baseline');
    await expect(page.getByRole('heading', { level: 1, name: 'Baseline Architecture' })).toBeVisible();

    // 4. Open sidebar outline and navigate to cache
    await page.getByRole('button', { name: /Toggle outline/i }).click();
    await page.getByRole('button', { name: /Caching/i }).click();
    await page.waitForURL('/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    // Interactive CacheLoadExplorer should be visible and working
    await expect(page.getByText('Cache Load Explorer')).toBeVisible();
    await expect(page.getByText('Estimated DB Reads / sec (with cache):')).toBeVisible();

    // 5. Interact with Decision Challenge
    await expect(page.getByText('Architectural Dilemma: Redis Eviction & TTL Configuration')).toBeVisible();
    const optimalOption = page.getByRole('radio', { name: /Volatile-LRU \+ 24h TTL/i });
    await optimalOption.click();
    const simulateBtn = page.getByRole('button', { name: /Simulate & Evaluate Decision/i }).first();
    await simulateBtn.click();
    await expect(page.getByText('Optimal Architectural Decision').first()).toBeVisible();
    await expect(page.getByText('Senior FAANG Engineering Rationale:').first()).toBeVisible();

    // 6. Test Multi-Flow Switcher in Architecture Diagram
    await expect(page.getByRole('tab', { name: /Cache Hit/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Cache Miss/i })).toBeVisible();
    await page.getByRole('tab', { name: /Cache Miss/i }).click();
    await expect(page.getByText('Event 1 of 5')).toBeVisible();

    // 7. Open Cache concept panel via concept tag
    const cacheConceptLink = page.getByRole('button', { name: 'Cache', exact: true }).first();
    await cacheConceptLink.click();
    await expect(page).toHaveURL(/concept=cache/);
    await expect(page.getByRole('heading', { level: 2, name: 'Cache' }).first()).toBeVisible();
    await expect(page.getByText('Why this exists').first()).toBeVisible();

    // 8. Return home and verify Resume
    await page.goto('/');
    await page.waitForURL('/');
    
    // Resume card should be visible
    const resumeSection = page.getByRole('region', { name: 'Continue learning' });
    await expect(resumeSection).toBeVisible();
    await expect(resumeSection.getByText('URL Shortener')).toBeVisible();
    await expect(resumeSection.getByText('Caching Layer')).toBeVisible();
    
    const resumeBtn = resumeSection.getByRole('link', { name: 'Resume' });
    await expect(resumeBtn).toBeVisible();

    // 9. Export YAML
    await page.getByRole('button', { name: /Data/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export YAML/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/system-design-progress-.*\.yaml/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // 10. Reset with confirmation
    await page.getByRole('button', { name: /Data/i }).click();
    await page.getByRole('button', { name: /Reset Progress/i }).click();
    const resetDialog = page.getByRole('dialog', { name: 'Reset Progress' });
    await expect(resetDialog).toBeVisible();
    await resetDialog.getByRole('button', { name: 'Reset Progress' }).click();
    
    // After reset, resume section should be gone
    await expect(page.getByRole('region', { name: 'Continue learning' })).not.toBeVisible();

    // 11. Import the file and verify restoration
    await page.getByRole('button', { name: /Data/i }).click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Import YAML/i }).click();
    const fileChooser = await fileChooserPromise;
    if (downloadPath) {
      await fileChooser.setFiles(downloadPath);
    }
    
    const importDialog = page.getByRole('dialog', { name: 'Import Progress' });
    await expect(importDialog).toBeVisible();
    await expect(importDialog.getByText(/Found 1 known chapters/i)).toBeVisible();
    await importDialog.getByRole('button', { name: 'Replace' }).click();

    // Verified restored
    await expect(page.getByRole('region', { name: 'Continue learning' })).toBeVisible();
    await expect(resumeSection.getByText('Caching Layer')).toBeVisible();

    // 12. Standalone Concept Page Test
    await page.goto('/concepts/cache');
    await expect(page).toHaveURL('/concepts/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Cache' })).toBeVisible();
    await expect(page.getByText('Architectural Role')).toBeVisible();
    await expect(page.getByText('Deep Technical Explanation')).toBeVisible();
    await expect(page.getByText('Key Trade-offs')).toBeVisible();

    // 13. Legacy Hash URL compatibility
    await page.goto('/#/archetypes/url-shortener/steps/id-generation');
    // Replaces hash with real path
    await expect(page).toHaveURL('/archetypes/url-shortener/steps/id-generation');
    await expect(page.getByRole('heading', { level: 1, name: 'Short-Code Generation' })).toBeVisible();
  });

  test('flow pill auto-play and study notes with step and chapter scopes', async ({ page }) => {
    await page.goto('/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    // 1. Verify Flow Pill Auto-Play on click
    const cacheMissTab = page.getByRole('tab', { name: /Cache Miss/i });
    await expect(cacheMissTab).toBeVisible();
    await cacheMissTab.click();

    // The sequence should immediately start playing without clicking play
    const pauseBtn = page.getByRole('button', { name: /Pause flow/i });
    await expect(pauseBtn).toBeVisible();
    await expect(page.getByText('Event 1 of 5')).toBeVisible();

    // Auto-advances to Event 2 after 1.5s interval
    await expect(page.getByText('Event 2 of 5')).toBeVisible({ timeout: 3000 });
    await expect(pauseBtn).toBeVisible();

    // Auto-advances to Event 3
    await expect(page.getByText('Event 3 of 5')).toBeVisible({ timeout: 3000 });

    // Capture screenshot of auto-advancing flow
    await page.screenshot({ path: 'test-results/flow-pill-autoplay.png', fullPage: false });

    // Click active pill again to restart from Event 1 and keep playing
    await cacheMissTab.click();
    await expect(page.getByText('Event 1 of 5')).toBeVisible();
    await expect(pauseBtn).toBeVisible();

    // Click another flow pill: Cache Hit
    const cacheHitTab = page.getByRole('tab', { name: /Cache Hit/i });
    await cacheHitTab.click();
    await expect(page.getByRole('button', { name: /Pause flow/i })).toBeVisible();
    await expect(page.getByText('Event 1 of 4')).toBeVisible();

    // 2. Open Study Notes Modal via Top Toolbar
    const notesBtn = page.getByRole('button', { name: 'Study notes' });
    await expect(notesBtn).toBeVisible();
    await notesBtn.click();

    // Verify Modal structure
    const notesDialog = page.getByRole('dialog', { name: 'Study Notes' });
    await expect(notesDialog).toBeVisible();

    const stepTab = notesDialog.getByRole('tab', { name: /Current Step/i });
    const chapterTab = notesDialog.getByRole('tab', { name: /Entire Chapter/i });
    await expect(stepTab).toBeVisible();
    await expect(chapterTab).toBeVisible();
    await expect(stepTab).toHaveAttribute('aria-selected', 'true');

    // Type note for current step
    const stepTextarea = notesDialog.getByRole('textbox');
    await stepTextarea.fill('Key Redis trade-off: use volatile-lru with 24h TTL to prevent cold cache thundering herd.');
    await expect(notesDialog.getByText(/Saved/i).first()).toBeVisible();

    // Switch to Entire Chapter tab
    await chapterTab.click();
    await expect(chapterTab).toHaveAttribute('aria-selected', 'true');
    const chapterTextarea = notesDialog.getByRole('textbox');
    await chapterTextarea.fill('Overall URL Shortener Chapter: High-throughput 100M URLs/day design with Base62 ID partitioning.');

    // Screenshot of notes modal
    await page.screenshot({ path: 'test-results/notes-dialog-open.png', fullPage: false });

    // Close dialog
    await notesDialog.getByRole('button', { name: 'Done' }).click();
    await expect(notesDialog).not.toBeVisible();

    // Notes indicator badge should be active
    await expect(notesBtn).toHaveClass(/actionIconBtnActive/);

    // 3. Test keyboard shortcut 'N' to reopen notes
    await page.keyboard.press('n');
    await expect(notesDialog).toBeVisible();

    // Verify step note content is preserved
    await stepTab.click();
    await expect(notesDialog.getByRole('textbox')).toHaveValue(/volatile-lru with 24h TTL/);

    // Verify chapter note content is preserved
    await chapterTab.click();
    await expect(notesDialog.getByRole('textbox')).toHaveValue(/100M URLs\/day design/);

    await notesDialog.getByRole('button', { name: 'Done' }).click();

    // 4. Test YAML export includes notes
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export YAML/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    if (downloadPath) {
      const fs = await import('fs');
      const { parse } = await import('yaml');
      const content = fs.readFileSync(downloadPath, 'utf8');
      const parsed = parse(content);
      expect(parsed.notes.steps['url-shortener']['cache']).toContain('volatile-lru with 24h TTL');
      expect(parsed.notes.archetypes['url-shortener']).toContain('100M URLs/day design');
    }
  });
});
