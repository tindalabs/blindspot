import { test, expect } from '@playwright/test';
import { installOtlpInterceptor, setupPage, flushSpans } from '../helpers/otlp.js';

// Prevent real external network calls in every test.
async function mockExternalFetch(page: Parameters<typeof installOtlpInterceptor>[0]) {
  await page.route('**/jsonplaceholder.typicode.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, title: 'mocked-todo' }),
    }),
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────────

test.describe('react-basic — navigation spans', () => {
  test('emits initial route span on page load', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/');
    // React useEffect fires asynchronously after commit. Yield one full event-loop
    // cycle (rAF → setTimeout) so the initial '/' effect can run and create the span.
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0))));
    // Click away so the '/tasks' effect calls clearRouteSpan(), ending the '/' span.
    await page.click('[data-blindspot-label="nav-tasks"]');
    // Yield again so the '/tasks' effect fires and ends the '/' span.
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0))));
    await flushSpans(page);

    const span = await otlp.waitForSpan(
      (s) => s.name === 'navigation (none) → /' && s.attributes['ux.route.trigger'] === 'initial',
    );
    expect(span.attributes['ux.route.to']).toBe('/');
    expect(span.attributes['ux.route.from']).toBe('');
  });

  test('emits user navigation span on route change', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/');
    await page.click('[data-blindspot-label="nav-tasks"]');
    // Navigate once more to end the /tasks span.
    await page.click('[data-blindspot-label="nav-about"]');
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'navigation / → /tasks');
    expect(span.attributes['ux.route.from']).toBe('/');
    expect(span.attributes['ux.route.to']).toBe('/tasks');
    expect(span.attributes['ux.route.trigger']).toBe('user');
  });
});

// ── Interactions ───────────────────────────────────────────────────────────────

test.describe('react-basic — interaction spans', () => {
  test('emits click span on interactive element', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/tasks');
    // Click the first task checkbox.
    await page.locator('input[type="checkbox"]').first().click();
    await flushSpans(page);

    const span = await otlp.waitForSpan(
      (s) => s.name.startsWith('click') && s.attributes['ux.element.tag'] === 'input',
    );
    expect(span.attributes['ux.interaction.type']).toBe('click');
  });

  test('emits form submit span on form submission', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/tasks');
    await page.fill('input[type="text"]', 'E2E test task');
    await page.click('button[type="submit"]');
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name.startsWith('form.submit'));
    expect(span.attributes['ux.form.valid']).toBe(true);
    expect(Number(span.attributes['ux.form.attempts'])).toBeGreaterThanOrEqual(1);
  });
});

// ── Network ────────────────────────────────────────────────────────────────────

test.describe('react-basic — network spans', () => {
  test('emits fetch span and injects W3C traceparent header', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    let capturedTraceparent: string | null = null;

    await page.route('**/jsonplaceholder.typicode.com/**', (route) => {
      capturedTraceparent = route.request().headers()['traceparent'] ?? null;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, title: 'mocked-todo' }),
      });
    });

    await page.goto('/');

    // Click "Fetch task data" and wait for the mocked response.
    await Promise.all([
      page.waitForResponse(/jsonplaceholder\.typicode\.com/),
      page.click('button.btn-primary'),
    ]);
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'GET /todos/1');
    expect(span.attributes['http.request.method']).toBe('GET');
    expect(Number(span.attributes['http.response.status_code'])).toBe(200);
    expect(String(span.attributes['url.full'])).toContain('jsonplaceholder.typicode.com');

    // Confirm the traceparent header was injected into the outbound request.
    expect(capturedTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });
});

// ── Errors ─────────────────────────────────────────────────────────────────────

test.describe('react-basic — error spans', () => {
  test('emits error span on unhandled exception', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);
    await mockExternalFetch(page);

    await page.goto('/');
    // The button uses setTimeout(0) to throw, so wait one tick before flushing.
    await page.click('button.btn-secondary');
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 50)));
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'error.unhandled');
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc).toBeDefined();
    expect(exc!.attributes['exception.type']).toBe('Error');
  });
});
