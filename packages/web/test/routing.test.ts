import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { trace } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initRouting, _resetRoutingForTesting } from '../src/instrumentations/routing.js';
import {
  _resetContextForTesting,
  getRouteSpan,
  getSessionTraceparent,
  saveRouteContextForReload,
  loadRouteContextAfterReload,
} from '../src/context.js';

let exporter: InMemorySpanExporter;

beforeAll(() => {
  exporter = setupOTel();
  initRouting(makeConfig() as ReturnType<typeof makeConfig>);
  // Push once to flush the initial span so tests start cleanly
  history.pushState({}, '', '/test-base');
  exporter.reset();
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  _resetRoutingForTesting();
});

describe('reload trace continuity', () => {
  beforeEach(() => {
    _resetContextForTesting();
    _resetRoutingForTesting();
  });

  afterEach(() => {
    try { sessionStorage.removeItem('blindspot.reload_ctx'); } catch { /* ignore */ }
  });

  it('saveRouteContextForReload does nothing when no route span is active', () => {
    saveRouteContextForReload();
    expect(sessionStorage.getItem('blindspot.reload_ctx')).toBeNull();
  });

  it('saveRouteContextForReload writes a valid traceparent to sessionStorage', () => {
    history.pushState({}, '', '/pre-reload');
    saveRouteContextForReload();
    expect(sessionStorage.getItem('blindspot.reload_ctx')).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/,
    );
  });

  it('loadRouteContextAfterReload returns undefined when nothing is stored', () => {
    expect(loadRouteContextAfterReload()).toBeUndefined();
  });

  it('loadRouteContextAfterReload restores span context and clears the key', () => {
    const traceId = 'a0'.repeat(16);
    const spanId = 'b0'.repeat(8);
    sessionStorage.setItem('blindspot.reload_ctx', `00-${traceId}-${spanId}-01`);

    const ctx = loadRouteContextAfterReload();
    expect(ctx).toBeDefined();
    expect(sessionStorage.getItem('blindspot.reload_ctx')).toBeNull();

    const sc = trace.getSpanContext(ctx!);
    expect(sc?.traceId).toBe(traceId);
    expect(sc?.spanId).toBe(spanId);
    expect(sc?.isRemote).toBe(true);
  });

  it('span started with reloaded context shares traceId with the pre-reload span', () => {
    history.pushState({}, '', '/before-reload');
    const preReloadTraceId = getRouteSpan()?.spanContext().traceId;
    expect(preReloadTraceId).toBeDefined();

    saveRouteContextForReload();
    const reloadContext = loadRouteContextAfterReload();
    expect(reloadContext).toBeDefined();

    const span = trace.getTracer('test').startSpan('navigation (none) → /before-reload', {}, reloadContext);
    expect(span.spanContext().traceId).toBe(preReloadTraceId);
    span.end();
  });
});

describe('initRouting', () => {
  it('creates a span on pushState navigation', () => {
    history.pushState({}, '', '/about');
    history.pushState({}, '', '/contact'); // ends the /about span
    const about = exporter.getFinishedSpans().find((s) => s.attributes['ux.route.to'] === '/about');
    expect(about).toBeDefined();
    expect(about?.attributes['ux.route.trigger']).toBe('user');
  });

  it('records the previous path as ux.route.from', () => {
    history.pushState({}, '', '/step-1');
    history.pushState({}, '', '/step-2'); // ends /step-1
    history.pushState({}, '', '/step-3'); // ends /step-2
    const step2 = exporter.getFinishedSpans().find((s) => s.attributes['ux.route.to'] === '/step-2');
    expect(step2?.attributes['ux.route.from']).toBe('/step-1');
  });

  it('ends the previous route span when navigating away', () => {
    history.pushState({}, '', '/page-a');
    history.pushState({}, '', '/page-b'); // ends /page-a
    const pageA = exporter
      .getFinishedSpans()
      .find((s) => s.attributes['ux.route.to'] === '/page-a');
    expect(pageA?.ended).toBe(true);
  });

  it('creates a span on replaceState navigation', () => {
    history.replaceState({}, '', '/replaced');
    history.pushState({}, '', '/next'); // ends /replaced
    const replaced = exporter
      .getFinishedSpans()
      .find((s) => s.attributes['ux.route.to'] === '/replaced');
    expect(replaced).toBeDefined();
    expect(replaced?.attributes['ux.route.trigger']).toBe('user');
  });
});

describe('getSessionTraceparent', () => {
  beforeEach(() => {
    _resetContextForTesting();
    _resetRoutingForTesting();
  });

  it('returns null when no route span is active', () => {
    expect(getSessionTraceparent()).toBeNull();
  });

  it('returns a valid W3C traceparent string when a route span is active', () => {
    history.pushState({}, '', '/scent-test');
    expect(getSessionTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  it('traceparent contains the active route span traceId and spanId', () => {
    history.pushState({}, '', '/scent-id-check');
    const tp = getSessionTraceparent();
    const sc = getRouteSpan()?.spanContext();
    expect(tp).not.toBeNull();
    expect(tp).toContain(sc?.traceId);
    expect(tp).toContain(sc?.spanId);
  });

  it('returns null after the route span is cleared', () => {
    history.pushState({}, '', '/scent-clear');
    expect(getSessionTraceparent()).not.toBeNull();
    _resetContextForTesting();
    expect(getSessionTraceparent()).toBeNull();
  });
});
