import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const mockClearRouteSpan = vi.hoisted(() => vi.fn());
const mockBeginRouteSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);

const mockRouterEvents = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn() }));
const mockUseRouter = vi.hoisted(() =>
  vi.fn(() => ({ asPath: '/home', events: mockRouterEvents })),
);

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  clearRouteSpan: mockClearRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
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
    mockUseRouter.mockReturnValue({ asPath: '/home', events: mockRouterEvents });
  });
  afterEach(() => cleanup());

  it('creates an initial span from router.asPath on mount', () => {
    render(<BlindspotPagesRouter />);

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('registers only a routeChangeComplete handler (no separate routeChangeStart clear)', () => {
    render(<BlindspotPagesRouter />);

    const events = mockRouterEvents.on.mock.calls.map(([e]) => e);
    expect(events).toContain('routeChangeComplete');
    expect(events).not.toContain('routeChangeStart');
  });

  it('opens a route span on routeChangeComplete', () => {
    render(<BlindspotPagesRouter />);
    const handler = getEventHandler('routeChangeComplete');
    vi.clearAllMocks();

    act(() => { handler?.('/about'); });

    // Clearing the previous span here (not on routeChangeStart) keeps a route
    // span active through the navigation, so in-route activity nests.
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('creates a new span on routeChangeComplete', () => {
    render(<BlindspotPagesRouter />);
    const handler = getEventHandler('routeChangeComplete');
    vi.clearAllMocks();

    act(() => { handler?.('/about'); });

    expect(mockBeginRouteSpan).toHaveBeenCalledWith({
      from: '/home',
      to: '/about',
      trigger: 'user',
    });
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('removes event handlers and clears span on unmount', () => {
    const { unmount } = render(<BlindspotPagesRouter />);
    vi.clearAllMocks();

    unmount();

    expect(mockRouterEvents.off).toHaveBeenCalledWith('routeChangeComplete', expect.any(Function));
    expect(mockRouterEvents.off).not.toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
  });
});
