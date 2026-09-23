import { test, expect } from '@playwright/test';

test.describe('Visual & Responsive Verification', () => {
  test('desktop 1440x900 - lesson page layout, visual stage, explanation, challenges, and node drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    // Verify Visual Stage & Explanation Column are both visible side-by-side
    const visualStage = page.getByRole('region', { name: 'Architecture diagram visual stage' });
    const explanationCol = page.getByRole('complementary', { name: 'Step explanations and learning challenges' });
    await expect(visualStage).toBeVisible();
    await expect(explanationCol).toBeVisible();

    // Verify Multi-flow switcher is present
    await expect(page.getByRole('tab', { name: /Cache Hit/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Cache Miss/i })).toBeVisible();

    // Verify single Fit to panel icon is present (zoom +/- removed as requested)
    const fitBtn = page.getByRole('button', { name: 'Fit to panel' });
    await expect(fitBtn).toBeVisible();

    // Verify floating help tooltip button in bottom-left
    const helpBtn = page.getByRole('button', { name: /Diagram help/i });
    await expect(helpBtn).toBeVisible();
    await helpBtn.hover();
    await expect(page.getByText('Click any component in the diagram to explore its role, trade-offs, and failure modes.').first()).toBeVisible();

    // Verify canvas click & drag pan interaction
    const svgCanvas = page.locator('svg[aria-label="System architecture diagram"]');
    const svgBox = await svgCanvas.boundingBox();
    if (svgBox) {
      const startX = svgBox.x + svgBox.width / 2;
      const startY = svgBox.y + svgBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY + 40, { steps: 5 });
      await page.mouse.up();
    }

    // Verify trackpad / wheel zoom
    await svgCanvas.dispatchEvent('wheel', { deltaY: -120 });

    // Click fit to panel to reset
    await fitBtn.click();

    // Click on Cache Miss flow tab
    await page.getByRole('tab', { name: /Cache Miss/i }).click();

    // Click on Redis Cache node in diagram to open NodeSpecPanel
    const redisNode = page.locator('div[class*="nodeWrapper"]').filter({ hasText: 'Redis Cache' }).first();
    if (await redisNode.isVisible()) {
      await redisNode.click();
      await expect(page.getByRole('heading', { level: 3, name: 'Redis Cache' })).toBeVisible();
      await expect(page.getByText('Component Specification')).toBeVisible();
    }

    // Capture desktop screenshot
    await page.screenshot({ path: 'test-results/desktop-1440-cache-step.png', fullPage: false });

    // Close node drawer
    const closeBtn = page.getByRole('button', { name: 'Close node specification' });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // Scroll down to Decision Challenge
    const challengeSection = page.getByText('Architectural Dilemma: Redis Eviction & TTL Configuration');
    await challengeSection.scrollIntoViewIfNeeded();
    await expect(challengeSection).toBeVisible();

    // Select optimal option and simulate
    const optimalOption = page.getByRole('radio', { name: /Volatile-LRU \+ 24h TTL/i });
    await optimalOption.click();
    await page.getByRole('button', { name: /Simulate & Evaluate Decision/i }).first().click();
    await expect(page.getByText('Optimal Architectural Decision').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/desktop-1440-decision-challenge.png', fullPage: false });
  });

  test('desktop draggable divider - resize explanation panel left and right', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();

    const splitter = page.getByRole('separator', { name: /Resize explanation panel/i });
    await expect(splitter).toBeVisible();

    const explanationCol = page.getByRole('complementary', { name: 'Step explanations and learning challenges' });
    const initialBox = await explanationCol.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialWidth = initialBox!.width;

    const splitterBox = await splitter.boundingBox();
    expect(splitterBox).toBeTruthy();

    // 1. Drag to the LEFT (expands explanation panel)
    const splitterCenterX = splitterBox!.x + splitterBox!.width / 2;
    const splitterCenterY = splitterBox!.y + splitterBox!.height / 2;

    await page.mouse.move(splitterCenterX, splitterCenterY);
    await page.mouse.down();
    // Drag left by 120px
    await page.mouse.move(splitterCenterX - 120, splitterCenterY, { steps: 5 });
    await page.mouse.up();

    const expandedBox = await explanationCol.boundingBox();
    expect(expandedBox!.width).toBeGreaterThan(initialWidth + 80);

    // Capture screenshot with expanded explanation panel
    await page.screenshot({ path: 'test-results/desktop-1440-splitter-expanded.png', fullPage: false });

    // 2. Drag to the RIGHT (contracts explanation panel)
    const updatedSplitterBox = await splitter.boundingBox();
    const updatedCenterX = updatedSplitterBox!.x + updatedSplitterBox!.width / 2;
    await page.mouse.move(updatedCenterX, splitterCenterY);
    await page.mouse.down();
    // Drag right by 200px
    await page.mouse.move(updatedCenterX + 200, splitterCenterY, { steps: 5 });
    await page.mouse.up();

    const contractedBox = await explanationCol.boundingBox();
    expect(contractedBox!.width).toBeLessThan(initialWidth);

    // Capture screenshot with contracted explanation panel
    await page.screenshot({ path: 'test-results/desktop-1440-splitter-contracted.png', fullPage: false });

    // 3. Double click resets to default width (340px)
    await splitter.dblclick();
    const resetBox = await explanationCol.boundingBox();
    expect(Math.round(resetBox!.width)).toBe(340);
  });

  test('desktop 1920x1080 - wide screen layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/archetypes/url-shortener/steps/baseline');
    await expect(page.getByRole('heading', { level: 1, name: 'Baseline Architecture' })).toBeVisible();

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.screenshot({ path: 'test-results/desktop-1920-baseline.png', fullPage: false });
  });

  test('desktop 1366x768 - compact laptop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/archetypes/url-shortener/steps/requirements');
    await expect(page.getByRole('heading', { level: 1, name: 'Requirements & Scale' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.screenshot({ path: 'test-results/desktop-1366-requirements.png', fullPage: false });
  });

  test('mobile 375x667 - narrow viewport preservation without interstitial', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/archetypes/url-shortener/steps/requirements');
    await expect(page.getByRole('heading', { level: 1, name: 'Requirements & Scale' })).toBeVisible();

    // Ensure complete lesson content and navigation buttons are available
    await expect(page.getByRole('navigation', { name: 'Step navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mark step complete/i })).toBeVisible();

    // Ensure NO interstitial blocking screen
    const interstitial = page.getByText(/Please view on desktop/i);
    await expect(interstitial).not.toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-375-requirements.png', fullPage: false });

    // Navigate to cache step on mobile
    await page.goto('/archetypes/url-shortener/steps/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Caching Layer' })).toBeVisible();
    await expect(page.getByText('Architectural Dilemma: Redis Eviction & TTL Configuration')).toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-375-cache-step.png', fullPage: false });
  });

  test('standalone concept page on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/concepts/cache');
    await expect(page.getByRole('heading', { level: 1, name: 'Cache' })).toBeVisible();
    await expect(page.getByText('Architectural Role')).toBeVisible();
    await expect(page.getByText('Deep Technical Explanation')).toBeVisible();

    await page.screenshot({ path: 'test-results/desktop-concept-cache.png', fullPage: false });
  });

  test('home page layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'System Design Atlas' })).toBeVisible();
    await expect(page.getByText('2 chapters available · 18 chapters planned')).toBeVisible();

    await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: false });
  });
});
