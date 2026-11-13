import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { type InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initLifecycle } from '../src/instrumentations/lifecycle.js';
import { initClicks } from '../src/instrumentations/clicks.js';
import {
  beginRouteSpan,
  clearRouteSpan,
  getRouteSpan,
  _resetContextForTesting,
} from '../src/context.js';
import type { BeaconExporter } from '../src/beacon.js';

// Hiding the page ends the route span (the last reliable export point on mobile).
// These tests cover what happens when the user comes back to it.

let exporter: InMemorySpanExporter;
let visibility: DocumentVisibilityState = 'visible';

const beaconExporter = { useBeaconForNextExport: (): void => {} } as unknown as BeaconExporter;

beforeAll(() => {
  exporter = setupOTel();
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  const config = makeConfig() as ReturnType<typeof makeConfig>;
  initLifecycle(config, beaconExporter);
  initClicks(config);
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  visibility = 'visible';
  document.body.innerHTML = '';
});

function setVisibility(state: DocumentVisibilityState): void {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

function navigationSpans(): ReadableSpan[] {
  return exporter.getFinishedSpans().filter((span) => span.name === 'navigation');
}

// happy-dom's PageTransitionEvent is a plain Event without `persisted`, so set it directly.
function pageshow(persisted: boolean): Event {
  return Object.assign(new Event('pageshow'), { persisted });
}

function click(): void {
  const button = document.createElement('button');
  button.textContent = 'Save';
  document.body.appendChild(button);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('returning to a hidden page', () => {
  it('reopens the route as a new "resume" trace when the page is visible again', () => {
    const original = beginRouteSpan({ from: '/cart', to: '/checkout', trigger: 'user' });
    setVisibility('hidden');
    setVisibility('visible');

    const resumed = getRouteSpan();
    expect(resumed).toBeDefined();
    resumed?.end();
    const [, resumedSpan] = navigationSpans();
    expect(resumedSpan.attributes).toEqual({
      'ux.route.from': '/checkout',
      'ux.route.to': '/checkout',
      'ux.route.trigger': 'resume',
    });
    expect(resumedSpan.spanContext().traceId).not.toBe(original.spanContext().traceId);
  });

  it('nests a click after returning under the resumed route, not in its own root trace', () => {
    beginRouteSpan({ from: '', to: '/checkout', trigger: 'initial' });
    setVisibility('hidden');
    setVisibility('visible');
    const resumed = getRouteSpan();
    expect(resumed).toBeDefined();
    click();

    const clickSpan = exporter.getFinishedSpans().find((span) => span.name === 'click button');
    expect(clickSpan).toBeDefined();
    expect(clickSpan?.parentSpanContext?.spanId).toBe(resumed?.spanContext().spanId);
  });

  it('resumes once when both visibilitychange and pagehide fired while leaving', () => {
    beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    setVisibility('hidden');
    window.dispatchEvent(new Event('pagehide'));
    setVisibility('visible');
    setVisibility('visible');

    getRouteSpan()?.end();
    expect(navigationSpans().map((span) => span.attributes['ux.route.trigger'])).toEqual([
      'initial',
      'resume',
    ]);
  });

  it('resumes a page restored from the back/forward cache', () => {
    beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(pageshow(true));

    expect(getRouteSpan()).toBeDefined();
  });

  it('does not resume on a pageshow that is a fresh load', () => {
    beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(pageshow(false));

    expect(getRouteSpan()).toBeUndefined();
  });

  it('keeps a route opened while hidden instead of resuming the old one', () => {
    beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    setVisibility('hidden');
    const current = beginRouteSpan({ from: '/a', to: '/b', trigger: 'user' });
    setVisibility('visible');

    expect(getRouteSpan()).toBe(current);
  });

  it('does not resume a route that was cleared, such as on router unmount', () => {
    beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    setVisibility('hidden');
    clearRouteSpan();
    setVisibility('visible');

    expect(getRouteSpan()).toBeUndefined();
  });

  it('starts nothing when there was no route span before hiding', () => {
    setVisibility('hidden');
    setVisibility('visible');

    expect(getRouteSpan()).toBeUndefined();
    expect(navigationSpans()).toHaveLength(0);
  });
});
