import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const mockSetRouteSpan = vi.hoisted(() => vi.fn());
const mockClearRouteSpan = vi.hoisted(() => vi.fn());
const mockLoadRouteContextAfterReload = vi.hoisted(() => vi.fn());
const mockStartSpan = vi.hoisted(() => vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  setRouteSpan: mockSetRouteSpan,
  clearRouteSpan: mockClearRouteSpan,
  getRouteSpan: vi.fn(),
  getTracer: vi.fn().mockReturnValue({ startSpan: mockStartSpan }),
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

  it('ends the previous span and creates a new one on navigation', () => {
    const { rerender } = renderHook(
      ({ pathname }: { pathname: string }) => useBlindspotNavigate(pathname, ''),
      { initialProps: { pathname: '/home' } },
    );

    vi.clearAllMocks();
    mockLoadRouteContextAfterReload.mockReturnValue(undefined);

    act(() => {
      rerender({ pathname: '/about' });
    });

    expect(mockClearRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockStartSpan).toHaveBeenCalledWith(
      'navigation /home → /about',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'ux.route.trigger': 'user',
          'ux.route.to': '/about',
          'ux.route.from': '/home',
        }),
      }),
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

    expect(mockStartSpan).toHaveBeenLastCalledWith(
      'navigation /home → /about',
      expect.objectContaining({
        attributes: expect.objectContaining({ 'ux.route.trigger': 'back-forward' }),
      }),
      undefined,
    );
  });

  it('loads reload context on initial navigation', () => {
    const fakeCtx = {};
    mockLoadRouteContextAfterReload.mockReturnValue(fakeCtx);

    renderHook(() => useBlindspotNavigate('/home', ''));

    expect(mockLoadRouteContextAfterReload).toHaveBeenCalledTimes(1);
    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      fakeCtx,
    );
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
