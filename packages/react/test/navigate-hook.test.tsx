import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const mockBeginRouteSpan = vi.hoisted(() => vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }));
const mockLoadRouteContextAfterReload = vi.hoisted(() => vi.fn());

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  beginRouteSpan: mockBeginRouteSpan,
  getRouteSpan: vi.fn(),
  loadRouteContextAfterReload: mockLoadRouteContextAfterReload,
}));

vi.mock('@tindalabs/blindspot-core', () => ({}));

import { useBlindspotNavigate } from '../src/navigate-hook.js';

describe('useBlindspotNavigate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);
  });
  afterEach(() => cleanup());

  it('creates an initial span on first render', () => {
    renderHook(() => useBlindspotNavigate('/home', ''));

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '', to: '/home', trigger: 'initial' },
      undefined,
    );
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
  });

  it('creates a new span on navigation', () => {
    const { rerender } = renderHook(
      ({ pathname }: { pathname: string }) => useBlindspotNavigate(pathname, ''),
      { initialProps: { pathname: '/home' } },
    );

    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);

    act(() => {
      rerender({ pathname: '/about' });
    });

    expect(mockBeginRouteSpan).toHaveBeenCalledWith(
      { from: '/home', to: '/about', trigger: 'user' },
      undefined,
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
      undefined,
    );
  });

  it('loads reload context on initial navigation', () => {
    const fakeCtx = {};
    mockLoadRouteContextAfterReload.mockReturnValue(fakeCtx);

    renderHook(() => useBlindspotNavigate('/home', ''));

    expect(mockLoadRouteContextAfterReload).toHaveBeenCalledTimes(1);
    expect(mockBeginRouteSpan).toHaveBeenCalledWith(expect.any(Object), fakeCtx);
  });

  it('does not load reload context on subsequent navigations', () => {
    const { rerender } = renderHook(
      ({ pathname }: { pathname: string }) => useBlindspotNavigate(pathname, ''),
      { initialProps: { pathname: '/home' } },
    );

    mockLoadRouteContextAfterReload.mockClear();

    act(() => {
      rerender({ pathname: '/about' });
    });

    expect(mockLoadRouteContextAfterReload).not.toHaveBeenCalled();
  });
});
