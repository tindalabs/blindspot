import { test, expect } from '@playwright/test';
import { installOtlpInterceptor, setupPage, flushSpans } from '../helpers/otlp.js';

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

test.describe('next-app-router — navigation spans', () => {
  test('emits initial route span on page load', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/');
    // Next.js hydrates the page before useEffect fires. Yield one event-loop
    // cycle so the BlindspotAppRouter effect runs and creates the initial span.
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0))));
    // Click away so the /tasks effect calls clearRouteSpan(), ending the '/' span.
    await page.click('[data-blindspot-label="nav-tasks"]');
    // Yield again so the /tasks effect fires and ends the '/' span.
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
    // Wait for the client-side navigation to settle before flushing. Next.js App
    // Router navigation is async; clicking a second link before it completes
    // cancels the first, so usePathname() never returns '/tasks'.
    await page.waitForURL('**/tasks');
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0))));
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'navigation / → /tasks');
    expect(span.attributes['ux.route.from']).toBe('/');
    expect(span.attributes['ux.route.to']).toBe('/tasks');
    expect(span.attributes['ux.route.trigger']).toBe('user');
  });
});

// ── Interactions ───────────────────────────────────────────────────────────────

test.describe('next-app-router — interaction spans', () => {
  test('emits click span on interactive element', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);

    await page.goto('/tasks');
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

test.describe('next-app-router — network spans', () => {
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

    await Promise.all([
      page.waitForResponse(/jsonplaceholder\.typicode\.com/),
      page.click('[data-blindspot-label="fetch-task-data"]'),
    ]);
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'GET /todos/1');
    expect(span.attributes['http.request.method']).toBe('GET');
    expect(Number(span.attributes['http.response.status_code'])).toBe(200);
    expect(String(span.attributes['url.full'])).toContain('jsonplaceholder.typicode.com');
    expect(capturedTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });
});

// ── Errors ─────────────────────────────────────────────────────────────────────

test.describe('next-app-router — error spans', () => {
  test('emits error span on unhandled exception', async ({ page }) => {
    await setupPage(page);
    const otlp = installOtlpInterceptor(page);
    await mockExternalFetch(page);

    await page.goto('/');
    await page.click('[data-blindspot-label="trigger-error"]');
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 50)));
    await flushSpans(page);

    const span = await otlp.waitForSpan((s) => s.name === 'error.unhandled');
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc).toBeDefined();
    expect(exc!.attributes['exception.type']).toBe('Error');
  });
});
