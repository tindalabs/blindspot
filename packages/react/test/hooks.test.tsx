import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

const mockSpan = vi.hoisted(() => ({
  addEvent: vi.fn(),
  setAttribute: vi.fn(),
  end: vi.fn(),
}));

const mockGetRouteSpan = vi.hoisted(() => vi.fn());

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  setRouteSpan: vi.fn(),
  clearRouteSpan: vi.fn(),
  getRouteSpan: mockGetRouteSpan,
  loadRouteContextAfterReload: vi.fn(),
}));

vi.mock('@tindalabs/blindspot-core', () => ({
  getTracer: vi.fn(),
}));

import { useSpan } from '../src/hooks.js';

describe('useSpan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRouteSpan.mockReturnValue(mockSpan);
  });
  afterEach(() => cleanup());

  it('addEvent forwards to the current route span', () => {
    const { result } = renderHook(() => useSpan());

    result.current.addEvent('checkout_started', { 'cart.items': 3 });

    expect(mockSpan.addEvent).toHaveBeenCalledWith('checkout_started', { 'cart.items': 3 });
  });

  it('setAttribute forwards to the current route span', () => {
    const { result } = renderHook(() => useSpan());

    result.current.setAttribute('ux.experiment', 'variant-b');

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('ux.experiment', 'variant-b');
  });

  it('addEvent is a no-op when no route span is active', () => {
    mockGetRouteSpan.mockReturnValue(undefined);
    const { result } = renderHook(() => useSpan());

    expect(() => result.current.addEvent('some_event')).not.toThrow();
    expect(mockSpan.addEvent).not.toHaveBeenCalled();
  });

  it('setAttribute is a no-op when no route span is active', () => {
    mockGetRouteSpan.mockReturnValue(undefined);
    const { result } = renderHook(() => useSpan());

    expect(() => result.current.setAttribute('key', 'value')).not.toThrow();
    expect(mockSpan.setAttribute).not.toHaveBeenCalled();
  });
});
