import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initBehavior, _resetBehaviorForTesting } from '../src/instrumentations/behavior.js';
import { setRouteSpan, clearRouteSpan, _resetContextForTesting } from '../src/context.js';

let exporter: InMemorySpanExporter;
const config = makeConfig();

beforeAll(() => {
  // Fake only the timer functions so the 60 s interaction-rate timeout is
  // controllable, while leaving Date/performance real for span timing + entropy.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  exporter = setupOTel();
  initBehavior(config as ReturnType<typeof makeConfig>);
});

afterAll(() => {
  vi.useRealTimers();
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  _resetBehaviorForTesting();
  document.body.innerHTML = '';
});

// Behavioral signals are written onto the active route span. Open one, drive the
// instrumentation, then close it so the finished span carries the attributes.
function startRoute(): void {
  setRouteSpan(trace.getTracer('test').startSpan('route'));
}

function endRouteAttrs() {
  clearRouteSpan();
  const [span] = exporter.getFinishedSpans();
  return span.attributes;
}

describe('initBehavior — time to first interaction', () => {
  it('records time_to_first_interaction_ms on the first interaction', () => {
    startRoute();
    window.dispatchEvent(new MouseEvent('click'));
    const attrs = endRouteAttrs();
    expect(typeof attrs['ux.session.time_to_first_interaction_ms']).toBe('number');
    expect(attrs['ux.session.time_to_first_interaction_ms'] as number).toBeGreaterThanOrEqual(0);
  });

  it('reports time to first interaction only once', () => {
    startRoute();
    window.dispatchEvent(new MouseEvent('click'));
    const first = exporter.getFinishedSpans(); // none yet — route still open
    expect(first.length).toBe(0);
    // A second interaction must not overwrite or re-emit the value.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const attrs = endRouteAttrs();
    expect(typeof attrs['ux.session.time_to_first_interaction_ms']).toBe('number');
  });
});

describe('initBehavior — paste ratio', () => {
  it('computes paste_ratio from paste vs typed characters in fields', () => {
    startRoute();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new Event('paste', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    const attrs = endRouteAttrs();
    // 1 paste + 1 typed char = 0.5
    expect(attrs['ux.input.paste_ratio']).toBe(0.5);
  });

  it('ignores paste events outside input/textarea fields', () => {
    startRoute();
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.dispatchEvent(new Event('paste', { bubbles: true }));
    const attrs = endRouteAttrs();
    expect(attrs['ux.input.paste_ratio']).toBeUndefined();
  });

  it('does not count modifier combos (e.g. Ctrl+V) as typed characters', () => {
    startRoute();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new Event('paste', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    const attrs = endRouteAttrs();
    // Only the paste counted → ratio 1.0
    expect(attrs['ux.input.paste_ratio']).toBe(1);
  });
});

describe('initBehavior — mouse entropy', () => {
  it('emits mouse_entropy once enough movement samples are collected', () => {
    startRoute();
    // Drive performance.now so each move is spaced 50 ms apart (inside the
    // 10–200 ms human-timescale window the sampler accepts).
    let t = 1000;
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => (t += 50));
    for (let i = 0; i < 14; i++) {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: i * 7, clientY: i * 3 }));
    }
    spy.mockRestore();
    const attrs = endRouteAttrs();
    const entropy = attrs['ux.interaction.mouse_entropy'];
    expect(typeof entropy).toBe('number');
    expect(entropy as number).toBeGreaterThanOrEqual(0);
    expect(entropy as number).toBeLessThanOrEqual(1);
  });

  it('does not emit mouse_entropy before 10 samples accumulate', () => {
    startRoute();
    let t = 1000;
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => (t += 50));
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: i }));
    }
    spy.mockRestore();
    const attrs = endRouteAttrs();
    expect(attrs['ux.interaction.mouse_entropy']).toBeUndefined();
  });
});

describe('initBehavior — interaction rate', () => {
  it('reports interaction_rate_60s after the 60 s window elapses', () => {
    startRoute();
    window.dispatchEvent(new MouseEvent('click'));
    window.dispatchEvent(new MouseEvent('click'));
    window.dispatchEvent(new MouseEvent('click'));
    vi.advanceTimersByTime(60_000);
    const attrs = endRouteAttrs();
    expect(attrs['ux.session.interaction_rate_60s']).toBe(3);
  });
});

describe('initBehavior — privacy invariants', () => {
  it('emits only numeric, derived signals — never DOM content or keystrokes', () => {
    startRoute();
    const input = document.createElement('input');
    input.name = 'card-number';
    document.body.appendChild(input);

    // Type a sensitive-looking value and paste; only counts/ratios may surface.
    input.dispatchEvent(new Event('paste', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    window.dispatchEvent(new MouseEvent('click'));

    const attrs = endRouteAttrs();
    const serialized = JSON.stringify(attrs);
    expect(serialized).not.toContain('card-number');

    // Every attribute behavior writes must be a number — no strings can carry text.
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('ux.')) {
        expect(typeof value).toBe('number');
      }
    }
  });
});
