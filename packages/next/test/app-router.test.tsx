import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mockBeginRouteSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/'));
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => null));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

import { BlindspotAppRouter } from '../src/app-router.js';

describe('BlindspotAppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBeginRouteSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });
  });
  afterEach(() => cleanup());

  it('creates an initial span on mount', () => {
    mockUsePathname.mockReturnValue('/home');
    mockUseSearchParams.mockReturnValue(null);

    render(<BlindspotAppRouter />);

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('creates a new span on pathname change', () => {
    mockUsePathname.mockReturnValue('/home');
    mockUseSearchParams.mockReturnValue(null);

    const { rerender } = render(<BlindspotAppRouter />);
    vi.clearAllMocks();
    mockBeginRouteSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });

    mockUsePathname.mockReturnValue('/about');
    rerender(<BlindspotAppRouter />);

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '/home', to: '/about', trigger: 'user' },
    );
  });

  it('appends search string to the route path', () => {
    mockUsePathname.mockReturnValue('/search');
    const fakeParams = { toString: () => 'q=hello' };
    mockUseSearchParams.mockReturnValue(fakeParams);

    render(<BlindspotAppRouter />);

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      expect.objectContaining({ from: '', to: '/search?q=hello' }),
    );
  });
});
