import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { onLCP, onCLS, onINP } from 'web-vitals';
import { initVitals } from '../src/instrumentations/vitals.js';
import { setRouteSpan, clearRouteSpan, _resetContextForTesting } from '../src/context.js';

// web-vitals listens to real browser performance entries that never fire under
// happy-dom. Stub the reporters so we can invoke the metric callbacks directly.
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onINP: vi.fn(),
}));

let exporter: InMemorySpanExporter;
const config = makeConfig();
let fireLCP: (metric: unknown) => void;
let fireCLS: (metric: unknown) => void;
let fireINP: (metric: unknown) => void;

beforeAll(() => {
  exporter = setupOTel();
  initVitals(config as ReturnType<typeof makeConfig>);
  fireLCP = vi.mocked(onLCP).mock.calls[0][0] as typeof fireLCP;
  fireCLS = vi.mocked(onCLS).mock.calls[0][0] as typeof fireCLS;
  fireINP = vi.mocked(onINP).mock.calls[0][0] as typeof fireINP;
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
});

function startRoute(): void {
  setRouteSpan(trace.getTracer('test').startSpan('route'));
}

function eventOnClosedRoute(name: string) {
  clearRouteSpan();
  const [span] = exporter.getFinishedSpans();
  return span.events.find((e) => e.name === name);
}

describe('initVitals', () => {
  it('emits an "lcp" event with the metric value on the route span', () => {
    startRoute();
    fireLCP({ value: 2500 });
    const event = eventOnClosedRoute('lcp');
    expect(event).toBeDefined();
    expect(event?.attributes?.['web_vital.value']).toBe(2500);
  });

  it('emits a "cls" event with the metric value', () => {
    startRoute();
    fireCLS({ value: 0.12 });
    const event = eventOnClosedRoute('cls');
    expect(event).toBeDefined();
    expect(event?.attributes?.['web_vital.value']).toBe(0.12);
  });

  it('emits an "inp" event with the metric value', () => {
    startRoute();
    fireINP({ value: 180 });
    const event = eventOnClosedRoute('inp');
    expect(event).toBeDefined();
    expect(event?.attributes?.['web_vital.value']).toBe(180);
  });

  it('drops metrics silently when no route span is active', () => {
    fireLCP({ value: 2500 });
    fireCLS({ value: 0.1 });
    fireINP({ value: 100 });
    expect(exporter.getFinishedSpans().length).toBe(0);
  });
});

describe('initVitals — privacy invariants', () => {
  it('records only the numeric value, never attribution/DOM detail from the metric', () => {
    startRoute();
    // web-vitals metrics can carry an `attribution` block with element selectors
    // and an `entries` array with raw PerformanceEntry data. None must leak.
    fireLCP({
      value: 2500,
      rating: 'good',
      attribution: { element: '#hero-banner > img.user-avatar', url: 'https://app/secret' },
      entries: [{ element: 'div.private-content' }],
    });
    const event = eventOnClosedRoute('lcp');
    expect(event?.attributes).toEqual({ 'web_vital.value': 2500 });
    const serialized = JSON.stringify(event?.attributes);
    expect(serialized).not.toContain('hero-banner');
    expect(serialized).not.toContain('user-avatar');
    expect(serialized).not.toContain('private-content');
  });
});
