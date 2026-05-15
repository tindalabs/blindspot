import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mockInit = vi.hoisted(() => vi.fn());

vi.mock('@tindalabs/blindspot', () => ({
  init: mockInit,
  setRouteSpan: vi.fn(),
  clearRouteSpan: vi.fn(),
  getRouteSpan: vi.fn(),
  loadRouteContextAfterReload: vi.fn(),
}));

vi.mock('@tindalabs/blindspot-core', () => ({
  getTracer: vi.fn(),
}));

import { BlindspotProvider } from '../src/provider.js';

const config = { serviceName: 'test', endpoint: '/v1/traces' };

describe('BlindspotProvider', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('calls init once on mount with routing disabled', () => {
    render(
      <BlindspotProvider config={config}>
        <div />
      </BlindspotProvider>,
    );

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'test',
        endpoint: '/v1/traces',
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });

  it('does not call init again on re-render', () => {
    const { rerender } = render(
      <BlindspotProvider config={config}>
        <div />
      </BlindspotProvider>,
    );

    rerender(
      <BlindspotProvider config={config}>
        <div />
      </BlindspotProvider>,
    );

    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('renders children', () => {
    const { getByText } = render(
      <BlindspotProvider config={config}>
        <span>hello world</span>
      </BlindspotProvider>,
    );

    expect(getByText('hello world')).toBeTruthy();
  });

  it('forces routing: false even when caller sets routing: true', () => {
    render(
      <BlindspotProvider config={{ ...config, instrument: { routing: true } }}>
        <div />
      </BlindspotProvider>,
    );

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        instrument: expect.objectContaining({ routing: false }),
      }),
    );
  });
});
