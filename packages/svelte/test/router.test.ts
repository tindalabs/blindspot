import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBeginRouteSpan = vi.hoisted(() => vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
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
  });

  it('creates an initial span on first navigation', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('does not register a beforeNavigate guard (avoids the root-context gap)', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    // Clearing in a separate beforeNavigate ended the route span before
    // afterNavigate re-set it — in-route activity in that gap orphaned.
    expect(hooks.beforeRegistered).toBe(false);
  });

  it('opens a route span on each navigation within afterNavigate', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');

    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);

    hooks.navigate('/home', '/about');
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(2);
  });

  it('records from/to path on subsequent navigation', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');
    vi.clearAllMocks();
    hooks.navigate('/home', '/about');

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '/home', to: '/about', trigger: 'user' },
    );
  });

  it('appends search params to the path', () => {
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigateWithSearch(null, '/search', '?q=hello');

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      expect.objectContaining({ from: '', to: '/search?q=hello' }),
    );
  });

  it('is a no-op in SSR (window undefined)', () => {
    const win = globalThis.window;
    // @ts-expect-error intentionally removing window to simulate SSR
    delete globalThis.window;
    const hooks = makeHooks();
    installBlindspotRouter(hooks);
    hooks.navigate(null, '/home');
    expect(mockBeginRouteSpan).not.toHaveBeenCalled();
    globalThis.window = win;
  });
});
