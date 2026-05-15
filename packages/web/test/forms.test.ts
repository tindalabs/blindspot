import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initForms } from '../src/instrumentations/forms.js';
import { _resetContextForTesting } from '../src/context.js';

let exporter: InMemorySpanExporter;

beforeAll(() => {
  exporter = setupOTel();
  initForms(makeConfig() as ReturnType<typeof makeConfig>);
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  document.body.innerHTML = '';
});

function submitForm(form: HTMLFormElement): void {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('initForms', () => {
  it('creates a span when a form is submitted', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    submitForm(form);
    expect(exporter.getFinishedSpans().length).toBe(1);
  });

  it('records the form name in the span name and attributes', () => {
    const form = document.createElement('form');
    form.name = 'checkout';
    document.body.appendChild(form);
    submitForm(form);
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toContain('checkout');
    expect(span.attributes['ux.form.name']).toBe('checkout');
  });

  it('uses form id when name is absent', () => {
    const form = document.createElement('form');
    form.id = 'login-form';
    document.body.appendChild(form);
    submitForm(form);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.form.name']).toBe('login-form');
  });

  it('increments attempt count on repeated submissions', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    submitForm(form);
    submitForm(form);
    submitForm(form);
    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes['ux.form.attempts']).toBe(1);
    expect(spans[2].attributes['ux.form.attempts']).toBe(3);
  });

  it('records form validity at submit time', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.required = true;
    input.value = '';
    form.appendChild(input);
    document.body.appendChild(form);
    submitForm(form);
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.form.valid']).toBe(false);
  });

  it('does not capture any field values', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'password';
    input.value = 'secret123';
    form.appendChild(input);
    document.body.appendChild(form);
    submitForm(form);
    const [span] = exporter.getFinishedSpans();
    expect(JSON.stringify(span.attributes)).not.toContain('secret123');
  });
});
