import { test, expect, type Locator } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const viewBox = (svg: Locator) => svg.evaluate(el => {
  const box = (el as SVGSVGElement).viewBox.baseVal;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
});

for (const route of ['url-shortener/steps/tradeoffs', 'chat/steps/resilience', 'ticket-booking/steps/regional-failure']) {
  test(`touch pinch, pan, cancellation, and existing controls: ${route}`, async ({ page, context }) => {
    await page.goto(`/archetypes/${route}`);
    const svg = page.getByRole('img', { name: 'System architecture diagram', exact: true });
    await expect(svg).toBeVisible();
    page.on('console', msg => { if (msg.text().startsWith('TOUCH')) console.log(msg.text()); });
    await svg.evaluate(el => {
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'pointermove']) {
        el.addEventListener(type, event => {
          const e = event as PointerEvent;
          console.log('TOUCH', type, e.pointerId, e.clientX, e.clientY);
        });
      }
    });
    const original = await viewBox(svg);
    const rect = await svg.boundingBox();
    if (!rect) throw new Error('Missing diagram bounds');
    const cdp = await context.newCDPSession(page);
    type Point = { id: number; x: number; y: number };
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: Point[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const screenPoint = (x: number, y: number) => svg.evaluate((el, point) => {
      const matrix = (el as SVGSVGElement).getScreenCTM();
      if (!matrix) throw new Error('Missing screen matrix');
      const mapped = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
      return { x: mapped.x, y: mapped.y };
    }, { x, y });
    const x = rect.x + rect.width * 0.58;
    const y = rect.y + rect.height * 0.7;
    const anchor = await screenPoint(x, y);
    const initial = [{ id: 1, x: x - 35, y }, { id: 2, x: x + 35, y }];
    await touch('touchStart', initial);
    await touch('touchMove', [{ id: 1, x: x - 70, y }, { id: 2, x: x + 70, y }]);
    await expect.poll(async () => (await viewBox(svg)).width).toBeCloseTo(original.width / 2, 1);
    const anchored = await screenPoint(x, y);
    expect(anchored.x).toBeCloseTo(anchor.x, 1);
    expect(anchored.y).toBeCloseTo(anchor.y, 1);

    // Pinch inward, then move both fingers together without changing their distance.
    await touch('touchMove', initial);
    await expect.poll(async () => (await viewBox(svg)).width).toBeCloseTo(original.width, 1);
    await touch('touchMove', initial.map(p => ({ ...p, y: p.y + 20 })));
    await expect.poll(async () => (await screenPoint(x, y + 20)).x).toBeCloseTo(anchor.x, 1);
    await expect.poll(async () => (await screenPoint(x, y + 20)).y).toBeCloseTo(anchor.y, 1);

    // Removing a finger preserves the view, then allows one-finger panning.
    const beforeLift = await viewBox(svg);
    const remaining = { id: 1, x: x - 35, y: y + 20 };
    // CDP touchEnd identifies the released contact, not the survivor.
    await touch('touchEnd', [{ id: 2, x: x + 35, y: y + 20 }]);
    expect(await viewBox(svg)).toEqual(beforeLift);
    await touch('touchMove', [{ ...remaining, x: remaining.x + 20 }]);
    await expect.poll(async () => (await viewBox(svg)).x).toBeLessThan(beforeLift.x);
    expect((await viewBox(svg)).width).toBeCloseTo(beforeLift.width, 1);
    await touch('touchEnd', []);

    await page.getByRole('button', { name: 'Fit to panel', exact: true }).tap();
    expect(await viewBox(svg)).toEqual(original);

    // A pinch starting on a node must zoom without selecting it.
    const node = svg.locator('[data-node-id]').first();
    const nodeBox = await node.boundingBox();
    if (!nodeBox) throw new Error('Missing node bounds');
    const nx = nodeBox.x + nodeBox.width / 2;
    const ny = nodeBox.y + nodeBox.height / 2;
    await touch('touchStart', [{ id: 1, x: nx - 3, y: ny }, { id: 2, x: nx + 3, y: ny }]);
    await touch('touchMove', [{ id: 1, x: nx - 30, y: ny }, { id: 2, x: nx + 30, y: ny }]);
    await expect.poll(async () => (await viewBox(svg)).width).toBeCloseTo(original.width / 3, 1);
    await touch('touchEnd', []);
    await expect(node).not.toHaveClass(/selected/);
    await page.getByRole('button', { name: 'Fit to panel', exact: true }).tap();

    // Lower zoom limit, cancellation, and a fresh tap after the canceled gesture.
    await touch('touchStart', [{ id: 1, x: x - 70, y }, { id: 2, x: x + 70, y }]);
    await touch('touchMove', [{ id: 1, x: x - 5, y }, { id: 2, x: x + 5, y }]);
    await expect.poll(async () => (await viewBox(svg)).width).toBeCloseTo(original.width / 0.4, 1);
    await touch('touchCancel', []);
    await page.getByRole('button', { name: 'Fit to panel', exact: true }).tap();
    await node.tap();
    await expect(node).toHaveClass(/selected/);

    // A single background tap still clears node selection, without moving the canvas.
    await page.touchscreen.tap(rect.x + 12, rect.y + rect.height / 2);
    await expect(node).not.toHaveClass(/selected/);
    expect(await viewBox(svg)).toEqual(original);

    // Trackpad/wheel and mouse panning still use the original handlers.
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -100);
    await expect.poll(async () => (await viewBox(svg)).width).toBeLessThan(original.width);
    await page.getByRole('button', { name: 'Fit to panel', exact: true }).click();
    // Pan from empty lower canvas space, away from left-edge nodes.
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height * 0.9);
    await page.mouse.down();
    await expect(svg).toHaveClass(/svgPanning/);
    await page.mouse.move(rect.x + rect.width / 2 + 20, rect.y + rect.height * 0.9 + 10);
    await page.mouse.up();
    await expect.poll(async () => (await viewBox(svg)).x).not.toBe(original.x);
    await page.getByRole('button', { name: 'Fit to panel', exact: true }).click();
    expect(await viewBox(svg)).toEqual(original);

    // Touches outside the SVG still scroll the lesson normally.
    const content = page.getByRole('complementary', { name: 'Step explanations and learning challenges' });
    await content.scrollIntoViewIfNeeded();
    const textBox = await content.boundingBox();
    if (!textBox) throw new Error('Missing lesson text');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await touch('touchStart', [{ id: 1, x: 180, y: Math.min(750, textBox.y + 150) }]);
    await touch('touchMove', [{ id: 1, x: 180, y: Math.min(750, textBox.y + 150) - 100 }]);
    await touch('touchEnd', []);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    await cdp.detach();
  });
}
