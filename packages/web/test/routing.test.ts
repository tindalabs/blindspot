import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initRouting, _resetRoutingForTesting } from '../src/instrumentations/routing.js';
import {
  _resetContextForTesting,
  getRouteSpan,
  getSessionTraceparent,
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

describe('initRouting', () => {
  it('creates a span on pushState navigation', () => {
    history.pushState({}, '', '/about');
    history.pushState({}, '', '/contact'); // ends the /about span
    const about = exporter.getFinishedSpans().find((s) => s.attributes['ux.route.to'] === '/about');
    expect(about).toBeDefined();
    expect(about?.attributes['ux.route.trigger']).toBe('user');
  });

  it('names route spans "navigation" and keeps the paths in attributes', () => {
    history.pushState({}, '', '/users/42');
    history.pushState({}, '', '/users/43'); // ends /users/42
    const route = exporter.getFinishedSpans().find((s) => s.attributes['ux.route.to'] === '/users/42');
    expect(route?.name).toBe('navigation');
    expect(route?.attributes['url.full']).toBe(`${location.origin}/users/42`);
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
