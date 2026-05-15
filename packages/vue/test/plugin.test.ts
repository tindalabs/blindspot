import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';

const mockInit = vi.hoisted(() => vi.fn());
const mockInstallBlindspotRouter = vi.hoisted(() => vi.fn());

vi.mock('@tindalabs/blindspot', () => ({
  init: mockInit,
  setRouteSpan: vi.fn(),
  clearRouteSpan: vi.fn(),
  getRouteSpan: vi.fn(),
  getRouteContext: vi.fn(),
  getTracer: vi.fn(),
  loadRouteContextAfterReload: vi.fn(),
}));

vi.mock('../src/router.js', () => ({
  installBlindspotRouter: mockInstallBlindspotRouter,
}));

import { BlindspotPlugin } from '../src/plugin.js';

const config = { serviceName: 'test', endpoint: '/v1/traces' };

describe('BlindspotPlugin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls init with routing disabled on install', () => {
    const app = createApp({ template: '<div/>' });
    app.use(BlindspotPlugin, { config });

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'test',
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });

  it('forces routing: false even when caller passes routing: true', () => {
    const app = createApp({ template: '<div/>' });
    app.use(BlindspotPlugin, { config: { ...config, instrument: { routing: true } } });

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });

  it('does not call installBlindspotRouter when no router is passed', () => {
    const app = createApp({ template: '<div/>' });
    app.use(BlindspotPlugin, { config });

    expect(mockInstallBlindspotRouter).not.toHaveBeenCalled();
  });

  it('calls installBlindspotRouter when a router is passed', () => {
    const fakeRouter = {} as never;
    const app = createApp({ template: '<div/>' });
    app.use(BlindspotPlugin, { config, router: fakeRouter });

    expect(mockInstallBlindspotRouter).toHaveBeenCalledWith(fakeRouter);
  });
});
