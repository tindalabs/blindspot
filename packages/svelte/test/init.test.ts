import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInit = vi.hoisted(() => vi.fn());

vi.mock('@tindalabs/blindspot', () => ({
  init: mockInit,
  setRouteSpan: vi.fn(),
  clearRouteSpan: vi.fn(),
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
  getTracer: vi.fn(),
  loadRouteContextAfterReload: vi.fn(),
}));

import { initBlindspot } from '../src/init.js';

const config = { serviceName: 'test', endpoint: '/v1/traces' };

describe('initBlindspot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls init with routing disabled', () => {
    initBlindspot(config);

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'test',
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });

  it('forces routing: false even when caller passes routing: true', () => {
    initBlindspot({ ...config, instrument: { routing: true } });

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });

  it('is a no-op in SSR (window undefined)', () => {
    const win = globalThis.window;
    // @ts-expect-error intentionally removing window to simulate SSR
    delete globalThis.window;
    initBlindspot(config);
    expect(mockInit).not.toHaveBeenCalled();
    globalThis.window = win;
  });
});
