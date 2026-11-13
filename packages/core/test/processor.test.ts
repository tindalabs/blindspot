import { describe, it, expect } from 'vitest';
import { SpanStatusCode, type Span } from '@opentelemetry/api';
import { BlindspotSpanProcessor } from '../src/processor.js';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import type { ResolvedConfig } from '../src/config.js';

const SAMPLED = true;
const NOT_SAMPLED = false;

function makeConfig(overrides: Partial<ResolvedConfig['sampling']> = {}): ResolvedConfig {
  return {
    endpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'test',
    privacy: {
      maskInputs: true,
      blockSelectors: [],
      piiPatterns: [],
      consentRequired: false,
      scrubAttributes: [],
    },
    sampling: { rate: 1.0, errorAware: false, ...overrides },
    instrument: {
      routing: true, clicks: true, forms: true, fetch: true, vitals: true, errors: true,
    },
  };
}

function makeSpan(name = 'test-span', statusCode = SpanStatusCode.UNSET): ReadableSpan {
  return {
    name,
    spanContext: () => ({ traceId: 'abc', spanId: 'def', traceFlags: 1 }),
    startTime: [0, 0],
    endTime: [0, 1],
    status: { code: statusCode },
    attributes: {},
    events: [],
    links: [],
    kind: 0,
    resource: { attributes: {} },
    instrumentationLibrary: { name: 'test' },
    duration: [0, 1],
    ended: true,
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    parentSpanId: undefined,
  } as unknown as ReadableSpan;
}

function makeExporter(): SpanExporter & { exported: ReadableSpan[] } {
  const exported: ReadableSpan[] = [];
  return {
    exported,
    export(spans, cb) {
      exported.push(...spans);
      cb({ code: 0 });
    },
    shutdown: () => Promise.resolve(),
  };
}

// ─── Normal mode (errorAware: false) ────────────────────────────────────────

describe('BlindspotSpanProcessor — normal mode', () => {
  it('routes spans directly to batch on onEnd when consented', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig(), SAMPLED);
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });

  it('buffers spans until consent is granted', async () => {
    const config = makeConfig();
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config, SAMPLED);
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
    proc.consentGate.grant();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });

  it('commitSession is a no-op in normal mode', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig(), SAMPLED);
    proc.onEnd(makeSpan());
    proc.commitSession();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });
});

// ─── Error-aware mode ────────────────────────────────────────────────────────

describe('BlindspotSpanProcessor — errorAware mode', () => {
  it('buffers spans until commitSession is called', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }), SAMPLED);
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0); // still buffered
  });

  it('flushes the buffer of a sampled session with no error', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }), SAMPLED);
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    proc.commitSession();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(2);
  });

  it('drops the buffer of an unsampled session with no error', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }), NOT_SAMPLED);
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    proc.commitSession();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
  });

  it('flushes everything when an error is seen, even in an unsampled session', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }), NOT_SAMPLED);
    proc.onEnd(makeSpan('before-error'));
    proc.onEnd(makeSpan('error-span', SpanStatusCode.ERROR));
    proc.onEnd(makeSpan('after-error'));
    proc.commitSession();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(3);
  });

  it('flushes buffered spans immediately when error span arrives', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }), NOT_SAMPLED);
    proc.onEnd(makeSpan('span-1'));
    proc.onEnd(makeSpan('span-2'));
    // Error arrives — buffered spans should be routed to batch right now
    proc.onEnd(makeSpan('error-span', SpanStatusCode.ERROR));
    await proc.forceFlush();
    // All three exported even before commitSession
    expect(exporter.exported).toHaveLength(3);
  });

  it('routes consent-buffered spans through error-aware logic on grant', async () => {
    const config = makeConfig({ errorAware: true });
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config, NOT_SAMPLED);
    proc.onEnd(makeSpan('before-consent'));
    // Grant consent — span moves to sessionBuffer (no error yet)
    proc.consentGate.grant();
    proc.commitSession(); // unsampled, no error: drop
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
  });

  it('consent-buffered error span triggers immediate flush on grant', async () => {
    const config = makeConfig({ errorAware: true });
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config, NOT_SAMPLED);
    proc.onEnd(makeSpan('before-consent', SpanStatusCode.ERROR));
    proc.consentGate.grant(); // error span routes through _route → hasError = true → immediate flush
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });
});

// ─── Privacy: span events ────────────────────────────────────────────────────
// Events carry user-derived strings too (exception messages and stack traces from
// recordException, custom recordEvent payloads), so they must get the same
// redaction as span attributes before export.

describe('BlindspotSpanProcessor — event redaction', () => {
  const EMAIL = /[\w.+-]+@[\w-]+\.\w{2,}/;

  async function exportThroughProcessor(
    privacy: Partial<ResolvedConfig['privacy']>,
    record: (span: Span) => void,
  ): Promise<ReadableSpan> {
    const config = makeConfig();
    config.privacy = { ...config.privacy, ...privacy };
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({
      spanProcessors: [new BlindspotSpanProcessor(exporter, config, SAMPLED)],
    });
    const span = provider.getTracer('test').startSpan('op');
    record(span);
    span.end();
    // BlindspotSpanProcessor wraps a BatchSpanProcessor; flush to reach the exporter.
    await provider.forceFlush();
    const [exported] = exporter.getFinishedSpans();
    return exported;
  }

  it('redacts piiPatterns matches in recordException messages and stack traces', async () => {
    const error = new Error('lookup failed for alice@example.com');
    error.stack = 'Error: lookup failed for alice@example.com\n    at load (app.js:1:1)';
    const exported = await exportThroughProcessor({ piiPatterns: [EMAIL] }, (span) =>
      span.recordException(error),
    );
    const exception = exported.events.find((e) => e.name === 'exception');
    expect(exception?.attributes?.['exception.message']).toBe('[redacted]');
    expect(exception?.attributes?.['exception.stacktrace']).toBe('[redacted]');
    expect(exception?.attributes?.['exception.type']).toBe('Error');
  });

  it('redacts piiPatterns matches in custom event attributes', async () => {
    const exported = await exportThroughProcessor({ piiPatterns: [EMAIL] }, (span) =>
      span.addEvent('signup', { contact: 'bob@example.com', step: 2 }),
    );
    const [event] = exported.events;
    expect(event.attributes?.['contact']).toBe('[redacted]');
    expect(event.attributes?.['step']).toBe(2);
  });

  it('strips scrubAttributes keys from event attributes', async () => {
    const exported = await exportThroughProcessor({ scrubAttributes: ['auth.token'] }, (span) =>
      span.addEvent('retry', { 'auth.token': 'bearer-xyz', attempt: 3 }),
    );
    const [event] = exported.events;
    expect(event.attributes).not.toHaveProperty('auth.token');
    expect(event.attributes?.['attempt']).toBe(3);
  });

  it('preserves event names, timestamps and attribute-less events', async () => {
    const exported = await exportThroughProcessor({ piiPatterns: [EMAIL] }, (span) =>
      span.addEvent('lcp'),
    );
    const [event] = exported.events;
    expect(event.name).toBe('lcp');
    expect(event.time).toHaveLength(2);
    expect(event.attributes ?? {}).toEqual({});
  });
});
