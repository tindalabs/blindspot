import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSetRouteSpan = vi.hoisted(() => vi.fn());
const mockClearRouteSpan = vi.hoisted(() => vi.fn());
const mockLoadRouteContextAfterReload = vi.hoisted(() => vi.fn());
const mockStartSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  setRouteSpan: mockSetRouteSpan,
  clearRouteSpan: mockClearRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
  getTracer: vi.fn().mockReturnValue({ startSpan: mockStartSpan }),
  loadRouteContextAfterReload: mockLoadRouteContextAfterReload,
}));

import { installBlindspotRouter } from '../src/router.js';

function makeRouter() {
  let beforeHook: (() => void) | undefined;
  let afterHook: ((to: { fullPath: string }) => void) | undefined;
  let beforeRegistered = false;
  return {
    beforeEach(fn: () => void) { beforeRegistered = true; beforeHook = fn; },
    afterEach(fn: (to: { fullPath: string }) => void) { afterHook = fn; },
    navigate(to: string) {
      beforeHook?.();
      afterHook?.({ fullPath: to });
    },
    get beforeRegistered() { return beforeRegistered; },
  };
}

describe('installBlindspotRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
  });

  it('creates an initial span on first navigation', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation (none) → /home',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'ux.route.trigger': 'initial',
          'ux.route.to': '/home',
          'ux.route.from': '',
        }),
      }),
      undefined,
    );
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('does not register a beforeEach guard (avoids the root-context gap)', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    // A separate beforeEach clear ended the route span before afterEach re-set
    // it, leaving a window where getRouteContext() was root — in-route clicks/
    // fetch/errors fired in that gap orphaned into their own root traces.
    expect(router.beforeRegistered).toBe(false);
  });

  it('clears then re-sets the route span atomically within afterEach', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');

    // Both happen in the single afterEach callback, clear before set, so a route
    // span is active at all times and in-route activity nests under it.
    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockClearRouteSpan.mock.invocationCallOrder[0]!).toBeLessThan(
      mockSetRouteSpan.mock.invocationCallOrder[0]!,
    );

    router.navigate('/about');
    expect(mockClearRouteSpan).toHaveBeenCalledTimes(2);
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(2);
  });

  it('records the from/to path on subsequent navigation', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
    router.navigate('/about');

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation /home → /about',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'ux.route.trigger': 'user',
          'ux.route.from': '/home',
          'ux.route.to': '/about',
        }),
      }),
      undefined,
    );
  });

  it('passes reload context on initial navigation', () => {
    const fakeCtx = {};
    mockLoadRouteContextAfterReload.mockReturnValue(fakeCtx);
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      fakeCtx,
    );
  });

  it('does not pass reload context on subsequent navigations', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');
    mockLoadRouteContextAfterReload.mockClear();
    router.navigate('/about');

    expect(mockLoadRouteContextAfterReload).not.toHaveBeenCalled();
    expect(mockStartSpan).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(Object),
      undefined,
    );
  });
});
