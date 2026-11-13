import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel } from './helpers.js';
import { beginRouteSpan, getRouteSpan, _resetContextForTesting } from '../src/context.js';

let exporter: InMemorySpanExporter;

beforeAll(() => {
  exporter = setupOTel();
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
});

describe('beginRouteSpan', () => {
  it('starts a "navigation" span with the route in attributes and makes it current', () => {
    const span = beginRouteSpan({ from: '/cart', to: '/checkout?step=2', trigger: 'user' });
    expect(getRouteSpan()).toBe(span);
    span.end();
    const [exported] = exporter.getFinishedSpans();
    expect(exported.name).toBe('navigation');
    expect(exported.attributes).toEqual({
      'ux.route.from': '/cart',
      'ux.route.to': '/checkout?step=2',
      'ux.route.trigger': 'user',
    });
  });

  it('ends the previous route span before starting the next', () => {
    const first = beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    beginRouteSpan({ from: '/a', to: '/b', trigger: 'user' });
    const ended = exporter.getFinishedSpans();
    expect(ended).toHaveLength(1);
    expect(ended[0].spanContext().spanId).toBe(first.spanContext().spanId);
  });

  it('parents the span on the given context, continuing that trace', () => {
    const parent = trace.getTracer('test').startSpan('previous-page');
    const parentContext = trace.setSpan(ROOT_CONTEXT, parent);
    const span = beginRouteSpan({ from: '', to: '/', trigger: 'initial' }, parentContext);
    expect(span.spanContext().traceId).toBe(parent.spanContext().traceId);
  });

  it('starts a new root trace when no parent context is given', () => {
    const first = beginRouteSpan({ from: '', to: '/a', trigger: 'initial' });
    const second = beginRouteSpan({ from: '/a', to: '/b', trigger: 'user' });
    expect(second.spanContext().traceId).not.toBe(first.spanContext().traceId);
  });
});
