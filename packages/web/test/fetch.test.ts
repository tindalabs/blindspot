import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { propagation, SpanStatusCode } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initFetch } from '../src/instrumentations/fetch.js';
import { _resetContextForTesting, setLastInteractionLabel } from '../src/context.js';

let exporter: InMemorySpanExporter;
const config = makeConfig();

// The wrapper captures window.fetch at init time as its passthrough. Record what
// it forwards (so we can inspect injected headers) and let each test choose the
// response via `responder`.
let lastInit: RequestInit | undefined;
let responder: () => Promise<Response>;

beforeAll(() => {
  exporter = setupOTel();
  // Ensure a real W3C propagator so traceparent injection is exercised.
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  window.fetch = ((_input: unknown, init?: RequestInit) => {
    lastInit = init;
    return responder();
  }) as typeof fetch;
  initFetch(config as ReturnType<typeof makeConfig>);
});

beforeEach(() => {
  lastInit = undefined;
  responder = () => Promise.resolve(new Response(null, { status: 200 }));
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
});

describe('initFetch — span shape', () => {
  it('creates a span named "<METHOD> <pathname>" with request attributes', async () => {
    await window.fetch('/api/users?page=2');
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('GET /api/users');
    expect(span.attributes['http.request.method']).toBe('GET');
    expect(span.attributes['url.full']).toBe('/api/users?page=2');
  });

  it('derives the method from the request init', async () => {
    await window.fetch('/api/orders', { method: 'post' });
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['http.request.method']).toBe('POST');
    expect(span.name).toBe('POST /api/orders');
  });

  it('tags the span with the last interaction label that triggered it', async () => {
    setLastInteractionLabel('submit-order');
    await window.fetch('/api/checkout', { method: 'POST' });
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['ux.api.triggered_by']).toBe('submit-order');
  });
});

describe('initFetch — W3C traceparent injection', () => {
  it('injects a well-formed traceparent header into the outgoing request', async () => {
    await window.fetch('/api/data');
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });

  it('traceparent carries the trace id of the emitted span', async () => {
    await window.fetch('/api/data');
    const [span] = exporter.getFinishedSpans();
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers.traceparent).toContain(span.spanContext().traceId);
  });

  it('preserves caller-supplied headers while adding traceparent', async () => {
    await window.fetch('/api/data', { headers: { 'x-custom': 'keep-me' } });
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers['x-custom']).toBe('keep-me');
    expect(headers.traceparent).toBeDefined();
  });
});

describe('initFetch — response + timing', () => {
  it('records the response status code and user wait time', async () => {
    responder = () => Promise.resolve(new Response(null, { status: 201 }));
    await window.fetch('/api/data');
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['http.response.status_code']).toBe(201);
    expect(typeof span.attributes['ux.api.user_wait_ms']).toBe('number');
    expect(span.attributes['ux.api.user_wait_ms'] as number).toBeGreaterThanOrEqual(0);
  });

  it('marks the span ERROR on a >= 400 response', async () => {
    responder = () => Promise.resolve(new Response(null, { status: 500 }));
    await window.fetch('/api/data');
    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.attributes['http.response.status_code']).toBe(500);
  });

  it('records the exception and ERROR status when the request rejects', async () => {
    responder = () => Promise.reject(new Error('network down'));
    await expect(window.fetch('/api/data')).rejects.toThrow('network down');
    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.events.find((e) => e.name === 'exception')).toBeDefined();
  });
});

describe('initFetch — self-instrumentation guard', () => {
  it('does not instrument calls to the OTLP export endpoint', async () => {
    await window.fetch(config.endpoint);
    expect(exporter.getFinishedSpans().length).toBe(0);
    // No traceparent injected onto the export call either.
    expect((lastInit?.headers as Record<string, string> | undefined)?.traceparent).toBeUndefined();
  });
});

describe('initFetch — header-shape normalization', () => {
  it('merges traceparent into a Headers instance without dropping existing entries', async () => {
    await window.fetch('/api/data', { headers: new Headers({ 'x-custom': 'keep-me' }) });
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers['x-custom']).toBe('keep-me');
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });

  it('merges traceparent into array-of-tuples headers without dropping existing entries', async () => {
    await window.fetch('/api/data', { headers: [['x-custom', 'keep-me']] });
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers['x-custom']).toBe('keep-me');
    expect(headers.traceparent).toBeDefined();
  });
});

describe('initFetch — input types', () => {
  it('instruments a URL-object input', async () => {
    await window.fetch(new URL('https://api.example.com/things'));
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('GET /things');
    expect(span.attributes['url.full']).toBe('https://api.example.com/things');
  });

  it('derives the method from a Request-object input', async () => {
    await window.fetch(new Request('/api/orders', { method: 'POST' }));
    const [span] = exporter.getFinishedSpans();
    expect(span.attributes['http.request.method']).toBe('POST');
    expect(span.name).toBe('POST /api/orders');
    // The wrapper re-wraps the Request so the injected traceparent rides along.
    expect((lastInit?.headers as Record<string, string>).traceparent).toBeDefined();
  });
});

describe('initFetch — malformed URL', () => {
  it('falls back to the raw URL in the span name when URL parsing throws', async () => {
    await window.fetch('http://[malformed');
    const [span] = exporter.getFinishedSpans();
    // getPathname() and the self-instrumentation guard both swallow the parse
    // error; the request is still instrumented using the raw URL string.
    expect(span.name).toBe('GET http://[malformed');
    expect(span.attributes['url.full']).toBe('http://[malformed');
    expect((lastInit?.headers as Record<string, string>).traceparent).toBeDefined();
  });
});

describe('initFetch — privacy invariants', () => {
  it('does not capture request body or authorization headers', async () => {
    await window.fetch('/api/login', {
      method: 'POST',
      headers: { authorization: 'Bearer super-secret-token' },
      body: JSON.stringify({ password: 'hunter2' }),
    });
    const [span] = exporter.getFinishedSpans();
    const serialized = JSON.stringify(span.attributes);
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('password');
  });
});
