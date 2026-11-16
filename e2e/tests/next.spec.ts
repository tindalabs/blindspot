import { test, expect, type Page } from '@playwright/test';
import { installOtlpInterceptor, setupPage } from '../helpers/otlp.js';

async function mockExternalFetch(page: Page) {
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
    const otlp = await installOtlpInterceptor(page);

    await page.goto('/');
    // Navigating away ends the '/' span. Both route spans come from effects that
    // run after hydration, so expectSpan keeps flushing until the '/' span arrives.
    await page.click('[data-blindspot-label="nav-tasks"]');
    await page.waitForURL('**/tasks');

    const span = await otlp.expectSpan(
      (s) =>
        s.name === 'navigation' &&
        s.attributes['ux.route.to'] === '/' &&
        s.attributes['ux.route.trigger'] === 'initial',
    );
    expect(span.attributes['ux.route.to']).toBe('/');
    expect(span.attributes['ux.route.from']).toBe('');
  });

  test('emits user navigation span on route change', async ({ page }) => {
    await setupPage(page);
    const otlp = await installOtlpInterceptor(page);

    await page.goto('/');
    await page.click('[data-blindspot-label="nav-tasks"]');
    // Next.js App Router navigation is async: hiding the page before it completes
    // would end the '/' span instead, and no '/' → '/tasks' span would exist.
    await page.waitForURL('**/tasks');

    const span = await otlp.expectSpan(
      (s) =>
        s.name === 'navigation' &&
        s.attributes['ux.route.from'] === '/' &&
        s.attributes['ux.route.to'] === '/tasks',
    );
    expect(span.attributes['ux.route.from']).toBe('/');
    expect(span.attributes['ux.route.to']).toBe('/tasks');
    expect(span.attributes['ux.route.trigger']).toBe('user');
  });
});

// ── Interactions ───────────────────────────────────────────────────────────────

test.describe('next-app-router — interaction spans', () => {
  test('emits click span on interactive element', async ({ page }) => {
    await setupPage(page);
    const otlp = await installOtlpInterceptor(page);

    await page.goto('/tasks');
    await page.locator('input[type="checkbox"]').first().click();

    const span = await otlp.expectSpan(
      (s) => s.name.startsWith('click') && s.attributes['ux.element.tag'] === 'input',
    );
    expect(span.attributes['ux.interaction.type']).toBe('click');
  });

  test('emits form submit span on form submission', async ({ page }) => {
    await setupPage(page);
    const otlp = await installOtlpInterceptor(page);

    await page.goto('/tasks');
    await page.fill('input[type="text"]', 'E2E test task');
    await page.click('button[type="submit"]');

    const span = await otlp.expectSpan((s) => s.name.startsWith('form.submit'));
    expect(span.attributes['ux.form.valid']).toBe(true);
    expect(Number(span.attributes['ux.form.attempts'])).toBeGreaterThanOrEqual(1);
  });
});

// ── Network ────────────────────────────────────────────────────────────────────

test.describe('next-app-router — network spans', () => {
  test('emits fetch span and injects W3C traceparent header', async ({ page }) => {
    await setupPage(page);
    const otlp = await installOtlpInterceptor(page);

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
      page.waitForResponse(/^https:\/\/jsonplaceholder\.typicode\.com\//),
      page.click('[data-blindspot-label="fetch-task-data"]'),
    ]);

    const span = await otlp.expectSpan(
      (s) => s.name === 'GET' && String(s.attributes['url.full']).endsWith('/todos/1'),
    );
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
    const otlp = await installOtlpInterceptor(page);
    await mockExternalFetch(page);

    await page.goto('/');
    // The button throws from a setTimeout(0); expectSpan flushes until the error span lands.
    await page.click('[data-blindspot-label="trigger-error"]');

    const span = await otlp.expectSpan((s) => s.name === 'error.unhandled');
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc).toBeDefined();
    expect(exc!.attributes['exception.type']).toBe('Error');
  });
});
