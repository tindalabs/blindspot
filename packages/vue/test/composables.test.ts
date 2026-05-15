import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddEvent = vi.hoisted(() => vi.fn());
const mockSetAttribute = vi.hoisted(() => vi.fn());
const mockStartSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);
const mockGetRouteSpan = vi.hoisted(() => vi.fn());
const mockGetRouteContext = vi.hoisted(() => vi.fn().mockReturnValue({}));

vi.mock('@tindalabs/blindspot', () => ({
  init: vi.fn(),
  setRouteSpan: vi.fn(),
  clearRouteSpan: vi.fn(),
  getRouteSpan: mockGetRouteSpan,
  getRouteContext: mockGetRouteContext,
  getTracer: vi.fn().mockReturnValue({ startSpan: mockStartSpan }),
  loadRouteContextAfterReload: vi.fn(),
}));

import { useBlindspot } from '../src/composables.js';

describe('useBlindspot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSpan.mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() });
    mockGetRouteContext.mockReturnValue({});
  });

  it('addEvent delegates to the current route span', () => {
    const fakeSpan = { addEvent: mockAddEvent, setAttribute: vi.fn(), end: vi.fn() };
    mockGetRouteSpan.mockReturnValue(fakeSpan);

    const { addEvent } = useBlindspot();
    addEvent('demo.click', { count: 1 });

    expect(mockAddEvent).toHaveBeenCalledWith('demo.click', { count: 1 });
  });

  it('addEvent is a no-op when there is no route span', () => {
    mockGetRouteSpan.mockReturnValue(undefined);

    const { addEvent } = useBlindspot();
    expect(() => addEvent('demo.click')).not.toThrow();
  });

  it('setAttribute delegates to the current route span', () => {
    const fakeSpan = { addEvent: vi.fn(), setAttribute: mockSetAttribute, end: vi.fn() };
    mockGetRouteSpan.mockReturnValue(fakeSpan);

    const { setAttribute } = useBlindspot();
    setAttribute('user.plan', 'pro');

    expect(mockSetAttribute).toHaveBeenCalledWith('user.plan', 'pro');
  });

  it('setAttribute is a no-op when there is no route span', () => {
    mockGetRouteSpan.mockReturnValue(undefined);

    const { setAttribute } = useBlindspot();
    expect(() => setAttribute('user.plan', 'pro')).not.toThrow();
  });

  it('startSpan creates a child span, calls fn, then ends the span', () => {
    const fakeSpan = { end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() };
    mockStartSpan.mockReturnValue(fakeSpan);

    const { startSpan } = useBlindspot();
    const fn = vi.fn();
    startSpan('my.operation', fn);

    expect(mockStartSpan).toHaveBeenCalledWith('my.operation', {}, expect.any(Object));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fakeSpan.end).toHaveBeenCalledTimes(1);
  });

  it('startSpan ends the span even when fn throws', () => {
    const fakeSpan = { end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() };
    mockStartSpan.mockReturnValue(fakeSpan);

    const { startSpan } = useBlindspot();
    expect(() => startSpan('throwing.op', () => { throw new Error('boom'); })).toThrow('boom');
    expect(fakeSpan.end).toHaveBeenCalledTimes(1);
  });
});
