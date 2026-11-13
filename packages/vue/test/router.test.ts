import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBeginRouteSpan = vi.hoisted(() => vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
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
  });

  it('creates an initial span on first navigation', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('does not register a beforeEach guard (avoids the root-context gap)', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    // A separate beforeEach clear ended the route span before afterEach re-set
    // it, leaving a window where getRouteContext() was root — in-route clicks/
    // fetch/errors fired in that gap orphaned into their own root traces.
    expect(router.beforeRegistered).toBe(false);
  });

  it('opens a route span on each navigation within afterEach', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');

    // Both happen in the single afterEach callback, clear before set, so a route
    // span is active at all times and in-route activity nests under it.
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);

    router.navigate('/about');
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(2);
  });

  it('records the from/to path on subsequent navigation', () => {
    const router = makeRouter();
    installBlindspotRouter(router as never);
    router.navigate('/home');
    vi.clearAllMocks();
    router.navigate('/about');

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '/home', to: '/about', trigger: 'user' },
    );
  });

});
