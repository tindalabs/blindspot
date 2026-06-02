import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initLifecycle } from '../src/instrumentations/lifecycle.js';
import { setRouteSpan, getRouteSpan, _resetContextForTesting } from '../src/context.js';
import type { BeaconExporter } from '../src/beacon.js';

// Stub the core processor so we can observe commitSession / forceFlush without a
// full SDK init. The route-span teardown still flows through the real exporter
// registered by setupOTel().
const h = vi.hoisted(() => ({
  getProcessor: vi.fn(),
  commitSession: vi.fn(),
  forceFlush: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tindalabs/blindspot-core', () => ({ getProcessor: h.getProcessor }));

let exporter: InMemorySpanExporter;
const sampling = { rate: 1.0, errorAware: false };
const config = makeConfig({ sampling });
const beaconExporter = {
  useBeaconForNextExport: vi.fn(),
} as unknown as BeaconExporter;

let visibility: DocumentVisibilityState = 'visible';

beforeAll(() => {
  exporter = setupOTel();
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  h.getProcessor.mockReturnValue({ commitSession: h.commitSession, forceFlush: h.forceFlush });
  initLifecycle(config as ReturnType<typeof makeConfig>, beaconExporter);
});

beforeEach(() => {
  vi.clearAllMocks();
  h.getProcessor.mockReturnValue({ commitSession: h.commitSession, forceFlush: h.forceFlush });
  sampling.errorAware = false;
  sampling.rate = 1.0;
  visibility = 'visible';
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
});

function hide(): void {
  visibility = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('initLifecycle — flush triggers', () => {
  it('flushes when the page becomes hidden', () => {
    hide();
    expect(beaconExporter.useBeaconForNextExport).toHaveBeenCalledOnce();
    expect(h.forceFlush).toHaveBeenCalledOnce();
  });

  it('does not flush while the page stays visible', () => {
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(beaconExporter.useBeaconForNextExport).not.toHaveBeenCalled();
    expect(h.forceFlush).not.toHaveBeenCalled();
  });

  it('flushes on pagehide', () => {
    window.dispatchEvent(new Event('pagehide'));
    expect(beaconExporter.useBeaconForNextExport).toHaveBeenCalledOnce();
    expect(h.forceFlush).toHaveBeenCalledOnce();
  });
});

describe('initLifecycle — route span teardown', () => {
  it('ends and clears the active route span on flush', () => {
    setRouteSpan(trace.getTracer('test').startSpan('route'));
    hide();
    expect(getRouteSpan()).toBeUndefined();
    const [span] = exporter.getFinishedSpans();
    expect(span).toBeDefined();
    expect(span.ended).toBe(true);
  });
});

describe('initLifecycle — error-aware sampling', () => {
  it('commits the session at the sampling rate when errorAware is enabled', () => {
    sampling.errorAware = true;
    sampling.rate = 0.25;
    hide();
    expect(h.commitSession).toHaveBeenCalledWith(0.25);
  });

  it('does not commit the session when errorAware is disabled', () => {
    sampling.errorAware = false;
    hide();
    expect(h.commitSession).not.toHaveBeenCalled();
  });
});

describe('initLifecycle — beacon transport', () => {
  it('switches the exporter to beacon transport before forcing the final flush', () => {
    hide();
    const beaconOrder = vi.mocked(beaconExporter.useBeaconForNextExport).mock.invocationCallOrder[0];
    const flushOrder = h.forceFlush.mock.invocationCallOrder[0];
    expect(beaconOrder).toBeLessThan(flushOrder);
  });
});

describe('initLifecycle — privacy invariants', () => {
  it('does not attach any attributes or DOM content to the flushed route span', () => {
    setRouteSpan(trace.getTracer('test').startSpan('route'));
    hide();
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes).toEqual({});
  });
});
