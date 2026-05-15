import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const mockSetRouteSpan = vi.hoisted(() => vi.fn());
const mockClearRouteSpan = vi.hoisted(() => vi.fn());
const mockLoadRouteContextAfterReload = vi.hoisted(() => vi.fn());
const mockStartSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);

const mockRouterEvents = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn() }));
const mockUseRouter = vi.hoisted(() =>
  vi.fn(() => ({ asPath: '/home', events: mockRouterEvents })),
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

vi.mock('next/router', () => ({
  useRouter: mockUseRouter,
}));

import { BlindspotPagesRouter } from '../src/pages-router.js';

function getEventHandler(event: string) {
  const call = mockRouterEvents.on.mock.calls.find(([e]) => e === event);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

describe('BlindspotPagesRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
    mockStartSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });
    mockUseRouter.mockReturnValue({ asPath: '/home', events: mockRouterEvents });
  });
  afterEach(() => cleanup());

  it('creates an initial span from router.asPath on mount', () => {
    render(<BlindspotPagesRouter />);

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation (none) → /home',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'ux.route.trigger': 'initial',
          'ux.route.from': '',
          'ux.route.to': '/home',
        }),
      }),
      undefined,
    );
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('uses reload context on initial navigation', () => {
    const fakeCtx = {};
    mockLoadRouteContextAfterReload.mockReturnValue(fakeCtx);

    render(<BlindspotPagesRouter />);

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      fakeCtx,
    );
  });

  it('registers routeChangeStart and routeChangeComplete handlers', () => {
    render(<BlindspotPagesRouter />);

    const events = mockRouterEvents.on.mock.calls.map(([e]) => e);
    expect(events).toContain('routeChangeStart');
    expect(events).toContain('routeChangeComplete');
  });

  it('clears the span on routeChangeStart', () => {
    render(<BlindspotPagesRouter />);
    const handler = getEventHandler('routeChangeStart');
    vi.clearAllMocks();

    act(() => { handler?.(); });

    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('creates a new span on routeChangeComplete', () => {
    render(<BlindspotPagesRouter />);
    const handler = getEventHandler('routeChangeComplete');
    vi.clearAllMocks();
    mockStartSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });

    act(() => { handler?.('/about'); });

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation /home → /about',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'ux.route.trigger': 'user',
          'ux.route.from': '/home',
          'ux.route.to': '/about',
        }),
      }),
    );
    expect(mockSetRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('removes event handlers and clears span on unmount', () => {
    const { unmount } = render(<BlindspotPagesRouter />);
    vi.clearAllMocks();

    unmount();

    expect(mockRouterEvents.off).toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    expect(mockRouterEvents.off).toHaveBeenCalledWith('routeChangeComplete', expect.any(Function));
    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
  });
});
