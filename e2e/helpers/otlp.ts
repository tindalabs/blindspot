import type { Page } from '@playwright/test';

// ── OTLP JSON parsing ──────────────────────────────────────────────────────────

interface OtlpAttr {
  key: string;
  value: Record<string, unknown>;
}

interface RawOtlpSpan {
  name: string;
  attributes?: OtlpAttr[];
  events?: Array<{ name: string; attributes?: OtlpAttr[] }>;
  status?: { code: number };
}

export interface Span {
  name: string;
  attributes: Record<string, unknown>;
  events: Array<{ name: string; attributes: Record<string, unknown> }>;
  status: { code: number };
}

function parseValue(v: Record<string, unknown>): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('intValue' in v) return Number(v.intValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('boolValue' in v) return v.boolValue;
  return undefined;
}

function parseAttrs(attrs: OtlpAttr[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of attrs) out[a.key] = parseValue(a.value);
  return out;
}

function parseBody(raw: string): Span[] {
  const spans: Span[] = [];
  const body = JSON.parse(raw) as {
    resourceSpans?: Array<{
      scopeSpans?: Array<{ spans?: RawOtlpSpan[] }>;
    }>;
  };
  for (const rs of body.resourceSpans ?? []) {
    for (const ss of rs.scopeSpans ?? []) {
      for (const s of ss.spans ?? []) {
        spans.push({
          name: s.name,
          attributes: parseAttrs(s.attributes),
          events: (s.events ?? []).map((e) => ({
            name: e.name,
            attributes: parseAttrs(e.attributes),
          })),
          status: s.status ?? { code: 0 },
        });
      }
    }
  }
  return spans;
}

// ── Page setup ─────────────────────────────────────────────────────────────────

/**
 * Replace navigator.sendBeacon with fetch so Playwright's page.route() can
 * intercept it. Must be called before page.goto().
 */
export async function setupPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
      // A failed request is not swallowed: the interceptor records it through
      // the page's `requestfailed` event and fails the test.
      void fetch(url, { method: 'POST', body: data ?? null, keepalive: true });
      return true;
    };
  });
}

/**
 * Hide the page the way the SDK sees it: the lifecycle handler ends the active
 * route span and flushes every ended span through the beacon.
 */
async function hidePage(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

// ── Interceptor ────────────────────────────────────────────────────────────────

const OTLP_ROUTE = '**/v1/traces';
const DEFAULT_TIMEOUT_MS = 5_000;
// Long enough for a beacon to reach the route handler, short enough that a span
// ending late (a route span from a deferred effect) is flushed on the next hide.
const POLL_INTERVAL_MS = 100;

export interface OtlpInterceptor {
  /**
   * Hide the page until a span matching `predicate` is exported, then return it.
   *
   * One hide is not enough: a span that ends after it (a framework effect that
   * runs late, a deferred error) stays in the SDK's batch until the 5-second
   * export timer, which races the wait. Each hide flushes whatever has ended
   * since the last one.
   */
  expectSpan(predicate: (s: Span) => boolean, timeoutMs?: number): Promise<Span>;
}

/**
 * Capture every span sent to /v1/traces. Must be awaited before page.goto().
 * An export the interceptor cannot read fails the next expectSpan() rather than
 * being dropped, since a dropped export looks exactly like a missing span.
 */
export async function installOtlpInterceptor(page: Page): Promise<OtlpInterceptor> {
  const captured: Span[] = [];
  const exportErrors: string[] = [];

  await page.route(OTLP_ROUTE, async (route) => {
    const raw = route.request().postData();
    if (raw === null) {
      exportErrors.push('an OTLP export request had no readable body');
    } else {
      try {
        captured.push(...parseBody(raw));
      } catch (error) {
        exportErrors.push(`an OTLP export body did not parse: ${String(error)}`);
      }
    }
    // Fulfilled even when unreadable, so the SDK does not see a network failure
    // and retry; the recorded error fails the test instead.
    await route.fulfill({ status: 200, body: '{}', contentType: 'application/json' });
  });

  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname === '/v1/traces') {
      exportErrors.push(`an OTLP export request failed: ${request.failure()?.errorText ?? 'unknown'}`);
    }
  });

  const describeCapture = (): string =>
    `Captured spans: ${JSON.stringify(captured.map((s) => s.name))}`;

  return {
    async expectSpan(predicate, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Span> {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        if (exportErrors.length > 0) {
          throw new Error(`${exportErrors.join('\n')}\n${describeCapture()}`);
        }
        const found = captured.find(predicate);
        if (found) return found;
        if (Date.now() >= deadline) {
          throw new Error(`expectSpan timed out after ${timeoutMs}ms.\n${describeCapture()}`);
        }
        await hidePage(page);
        await page.waitForTimeout(POLL_INTERVAL_MS);
      }
    },
  };
}
