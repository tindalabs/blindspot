import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const mockBeginRouteSpan = vi.hoisted(() => vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  getRouteSpan: vi.fn(),
}));

vi.mock('@tindalabs/blindspot-core', () => ({}));

import { useBlindspotNavigate } from '../src/navigate-hook.js';

describe('useBlindspotNavigate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('creates an initial span on first render', () => {
    renderHook(() => useBlindspotNavigate('/home', ''));

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('creates a new span on navigation', () => {
    const { rerender } = renderHook(
      ({ pathname }: { pathname: string }) => useBlindspotNavigate(pathname, ''),
      { initialProps: { pathname: '/home' } },
    );

    vi.clearAllMocks();

    act(() => {
      rerender({ pathname: '/about' });
    });

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '/home', to: '/about', trigger: 'user' },
    );
  });

  it('passes back-forward trigger through to the span', () => {
    type Props = { pathname: string; trigger?: 'user' | 'back-forward' };
    const { rerender } = renderHook(
      ({ pathname, trigger }: Props) => useBlindspotNavigate(pathname, '', trigger),
      { initialProps: { pathname: '/home' } as Props },
    );

    act(() => {
      rerender({ pathname: '/about', trigger: 'back-forward' });
    });

    expect(mockBeginRouteSpan).toHaveBeenLastCalledWith(
      { from: '/home', to: '/about', trigger: 'back-forward' },
    );
  });

});
