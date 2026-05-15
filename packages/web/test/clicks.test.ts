import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initClicks } from '../src/instrumentations/clicks.js';
import { _resetContextForTesting } from '../src/context.js';

let exporter: InMemorySpanExporter;
const config = makeConfig();

beforeAll(() => {
  exporter = setupOTel();
  initClicks(config as ReturnType<typeof makeConfig>);
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  document.body.innerHTML = '';
});

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('initClicks', () => {
  it('creates a span when a button is clicked', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Submit';
    document.body.appendChild(btn);
    click(btn);
    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toContain('click button');
  });

  it('records element tag, label, and interaction type', () => {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Close dialog');
    document.body.appendChild(btn);
    click(btn);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.element.tag']).toBe('button');
    expect(span.attributes['ux.element.label']).toBe('Close dialog');
    expect(span.attributes['ux.interaction.type']).toBe('click');
  });

  // Use a div (not a button) so happy-dom doesn't suppress clicks on disabled elements
  it('marks elements with the disabled attribute correctly', () => {
    const el = document.createElement('div');
    el.setAttribute('disabled', '');
    el.setAttribute('tabindex', '0'); // makes it interactive so dead_click is false
    document.body.appendChild(el);
    click(el);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.element.disabled']).toBe(true);
  });

  it('detects rage clicks (≥3 rapid clicks on the same element)', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    click(btn);
    click(btn);
    click(btn);
    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes['ux.rage_click']).toBe(false);
    expect(spans[2].attributes['ux.rage_click']).toBe(true);
  });

  it('marks non-interactive elements as dead clicks', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    click(div);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.dead_click']).toBe(true);
  });

  it('does not mark interactive elements as dead clicks', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    click(btn);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.dead_click']).toBe(false);
  });

  it('skips elements with data-blindspot-block', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-blindspot-block', '');
    document.body.appendChild(btn);
    click(btn);
    expect(exporter.getFinishedSpans().length).toBe(0);
  });

  it('uses data-blindspot-label over text content in the span name', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-blindspot-label', 'submit-order');
    btn.textContent = 'Place Order — $49.99';
    document.body.appendChild(btn);
    click(btn);
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toContain('submit-order');
    expect(span.name).not.toContain('$49.99');
  });

  it.each(['password', 'email', 'tel'])('skips clicks on input[type=%s]', (type) => {
    const input = document.createElement('input');
    input.type = type;
    document.body.appendChild(input);
    click(input);
    expect(exporter.getFinishedSpans().length).toBe(0);
  });

  it('does not skip clicks on non-sensitive inputs', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    click(input);
    expect(exporter.getFinishedSpans().length).toBe(1);
  });
});
