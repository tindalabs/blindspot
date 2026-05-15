import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mockSetRouteSpan = vi.hoisted(() => vi.fn());
const mockClearRouteSpan = vi.hoisted(() => vi.fn());
const mockLoadRouteContextAfterReload = vi.hoisted(() => vi.fn());
const mockStartSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/'));
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => null));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  setRouteSpan: mockSetRouteSpan,
  clearRouteSpan: mockClearRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
  getTracer: vi.fn().mockReturnValue({ startSpan: mockStartSpan }),
  loadRouteContextAfterReload: mockLoadRouteContextAfterReload,
}));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

import { BlindspotAppRouter } from '../src/app-router.js';

describe('BlindspotAppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
    mockStartSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });
  });
  afterEach(() => cleanup());

  it('creates an initial span on mount', () => {
    mockUsePathname.mockReturnValue('/home');
    mockUseSearchParams.mockReturnValue(null);

    render(<BlindspotAppRouter />);

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
    mockUsePathname.mockReturnValue('/home');
    mockUseSearchParams.mockReturnValue(null);

    render(<BlindspotAppRouter />);

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      fakeCtx,
    );
  });

  it('creates a new span and clears the old one on pathname change', () => {
    mockUsePathname.mockReturnValue('/home');
    mockUseSearchParams.mockReturnValue(null);

    const { rerender } = render(<BlindspotAppRouter />);
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
    mockStartSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });

    mockUsePathname.mockReturnValue('/about');
    rerender(<BlindspotAppRouter />);

    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
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

  it('appends search string to the route path', () => {
    mockUsePathname.mockReturnValue('/search');
    const fakeParams = { toString: () => 'q=hello' };
    mockUseSearchParams.mockReturnValue(fakeParams);

    render(<BlindspotAppRouter />);

    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation (none) → /search?q=hello',
      expect.any(Object),
      undefined,
    );
  });
});
