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
  for (const a of attrs) out[a.key] = parseValue(a.value as Record<string, unknown>);
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

// ── Interceptor ────────────────────────────────────────────────────────────────

type Listener = (span: Span) => void;

export interface OtlpInterceptor {
  getSpans(): Span[];
  waitForSpan(predicate: (s: Span) => boolean, timeoutMs?: number): Promise<Span>;
}

/**
 * Installs a page.route() handler that captures every span sent to /v1/traces.
 * Must be called before page.goto().
 */
export function installOtlpInterceptor(page: Page): OtlpInterceptor {
  const captured: Span[] = [];
  const listeners: Listener[] = [];

  void page.route('**/v1/traces', async (route) => {
    try {
      const raw = route.request().postData();
      if (raw) {
        const newSpans = parseBody(raw);
        for (const span of newSpans) {
          captured.push(span);
          for (const l of [...listeners]) l(span);
        }
      }
    } catch {
      // ignore parse errors — still fulfill so the SDK doesn't stall
    }
    await route.fulfill({ status: 200, body: '{}', contentType: 'application/json' });
  });

  return {
    getSpans: () => [...captured],

    waitForSpan(predicate, timeoutMs = 5_000): Promise<Span> {
      const found = captured.find(predicate);
      if (found) return Promise.resolve(found);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
          reject(
            new Error(
              `waitForSpan timed out after ${timeoutMs}ms.\n` +
                `Captured spans: ${JSON.stringify(captured.map((s) => s.name))}`,
            ),
          );
        }, timeoutMs);

        const listener: Listener = (s) => {
          if (predicate(s)) {
            clearTimeout(timer);
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
            resolve(s);
          }
        };
        listeners.push(listener);
      });
    },
  };
}

// ── Page setup ─────────────────────────────────────────────────────────────────

/**
 * Replace navigator.sendBeacon with fetch so Playwright's page.route() can
 * intercept it. Must be called before page.goto().
 */
export async function setupPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).sendBeacon = (url: string, data?: BodyInit | null) => {
      fetch(url, { method: 'POST', body: data as BodyInit, keepalive: true }).catch(() => {});
      return true;
    };
  });
}

/**
 * Trigger the SDK's page-hide flush: dispatches visibilitychange → hidden,
 * which causes the lifecycle handler to end the active route span and call
 * processor.forceFlush(). Use after actions to export spans immediately
 * instead of waiting for the BatchSpanProcessor's 5-second schedule.
 */
export async function flushSpans(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
