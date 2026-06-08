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
import type { NavigationEvent } from '../src/router.js';

function makeHooks() {
  let beforeHook: ((nav: { cancel: () => void }) => void) | undefined;
  let afterHook: ((nav: NavigationEvent) => void) | undefined;
  let beforeRegistered = false;

  return {
    get beforeRegistered() { return beforeRegistered; },
    beforeNavigate(fn: (nav: { cancel: () => void }) => void) {
      beforeRegistered = true;
      beforeHook = fn;
    },
    afterNavigate(fn: (nav: NavigationEvent) => void) {
      afterHook = fn;
    },
    navigate(from: string | null, to: string) {
      beforeHook?.({ cancel: vi.fn() });
      afterHook?.({
        from: from ? { url: { pathname: from, search: '' } } : null,
        to: { url: { pathname: to, search: '' } },
        type: 'link',
      });
    },
    navigateWithSearch(from: string | null, to: string, search: string) {
      beforeHook?.({ cancel: vi.fn() });
      afterHook?.({
        from: from ? { url: { pathname: from, search: '' } } : null,
        to: { url: { pathname: to, search } },
        type: 'link',
      });
    },
  };
}

describe('installBlindspotRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
  });

  it('creates an initial span on first navigation', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');

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

  it('does not register a beforeNavigate guard (avoids the root-context gap)', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    // Clearing in a separate beforeNavigate ended the route span before
    // afterNavigate re-set it — in-route activity in that gap orphaned.
    expect(hooks.beforeRegistered).toBe(false);
  });

  it('clears then re-sets the route span atomically within afterNavigate', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');

    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockClearRouteSpan.mock.invocationCallOrder[0]!).toBeLessThan(
      mockSetRouteSpan.mock.invocationCallOrder[0]!,
    );

    hooks.navigate('/home', '/about');
    expect(mockClearRouteSpan).toHaveBeenCalledTimes(2);
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(2);
  });

  it('records from/to path on subsequent navigation', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
    hooks.navigate('/home', '/about');

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

  it('appends search params to the path', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigateWithSearch(null, '/search', '?q=hello');

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation (none) → /search?q=hello',
      expect.objectContaining({
        attributes: expect.objectContaining({ 'ux.route.to': '/search?q=hello' }),
      }),
      undefined,
    );
  });

  it('loads reload context for the initial navigation', () => {
    const fakeContext = { spanId: 'abc' };
    mockLoadRouteContextAfterReload.mockReturnValue(fakeContext);

    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      fakeContext,
    );
  });

  it('does not pass reload context for subsequent navigations', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue({ spanId: 'should-not-be-used' });
    hooks.navigate('/home', '/about');

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      undefined,
    );
  });

  it('is a no-op in SSR (window undefined)', () => {
    const win = globalThis.window;
    // @ts-expect-error intentionally removing window to simulate SSR
    delete globalThis.window;
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');
    expect(mockStartSpan).not.toHaveBeenCalled();
    globalThis.window = win;
  });
});
