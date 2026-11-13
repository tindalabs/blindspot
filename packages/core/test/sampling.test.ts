import { afterEach, describe, expect, it, vi } from 'vitest';
import { context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { init, getProcessor, _resetForTesting } from '../src/init.js';
import { getTracer } from '../src/tracer.js';
import { isSessionSampled } from '../src/sampling.js';

// Fixture ids on either side of rate 0.5 (they hash to about 0.34 and 0.64).
const SAMPLED_AT_HALF = 'kept-2';
const NOT_SAMPLED_AT_HALF = 'alpha';
const SESSION_KEY = 'blindspot.session_id';
const ROUTES_PER_SESSION = 40;

describe('isSessionSampled', () => {
  it('gives the same answer for the same session every time', () => {
    expect(isSessionSampled(SAMPLED_AT_HALF, 0.5)).toBe(true);
    expect(isSessionSampled(SAMPLED_AT_HALF, 0.5)).toBe(true);
    expect(isSessionSampled(NOT_SAMPLED_AT_HALF, 0.5)).toBe(false);
  });

  it('keeps every session at rate 1 and none at rate 0', () => {
    const ids = Array.from({ length: 500 }, (_, i) => `session-${i}`);
    expect(ids.every((id) => isSessionSampled(id, 1))).toBe(true);
    expect(ids.some((id) => isSessionSampled(id, 0))).toBe(false);
  });

  it('keeps close to the configured fraction, even for near-identical fallback ids', () => {
    // Fallback ids differ only in a trailing counter; an unmixed hash clusters them.
    const ids = Array.from({ length: 10_000 }, (_, i) => `bs-lq0c9x2k-${i.toString(36)}`);
    const kept = ids.filter((id) => isSessionSampled(id, 0.3)).length / ids.length;
    expect(kept).toBeGreaterThan(0.28);
    expect(kept).toBeLessThan(0.32);
  });
});

describe('init() sampling', () => {
  afterEach(() => {
    _resetForTesting();
    trace.disable();
    context.disable();
    propagation.disable();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  async function exportedRoutesForSession(sessionId: string, errorAware: boolean): Promise<number> {
    sessionStorage.setItem(SESSION_KEY, sessionId);
    const exporter = new InMemorySpanExporter();
    init(
      { endpoint: 'http://localhost:4318/v1/traces', serviceName: 'test', sampling: { rate: 0.5, errorAware } },
      exporter,
    );
    // Each route span is its own root trace, and a session hides the page many
    // times (every tab switch), as in a real session.
    for (let i = 0; i < ROUTES_PER_SESSION; i++) {
      getTracer().startSpan('navigation').end();
      getProcessor()?.commitSession();
    }
    await getProcessor()?.forceFlush();
    return exporter.getFinishedSpans().length;
  }

  it('exports every route of a sampled session', async () => {
    expect(await exportedRoutesForSession(SAMPLED_AT_HALF, false)).toBe(ROUTES_PER_SESSION);
  });

  it('exports no route of a session outside the sample', async () => {
    expect(await exportedRoutesForSession(NOT_SAMPLED_AT_HALF, false)).toBe(0);
  });

  it('errorAware: keeps a sampled session on every page hide, whatever Math.random says', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(await exportedRoutesForSession(SAMPLED_AT_HALF, true)).toBe(ROUTES_PER_SESSION);
  });

  it('errorAware: drops an error-free session outside the sample on every page hide', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    expect(await exportedRoutesForSession(NOT_SAMPLED_AT_HALF, true)).toBe(0);
  });
});
