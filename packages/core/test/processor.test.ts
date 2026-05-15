import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { BlindspotSpanProcessor } from '../src/processor.js';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ResolvedConfig } from '../src/config.js';

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
    const proc = new BlindspotSpanProcessor(exporter, makeConfig());
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });

  it('buffers spans until consent is granted', async () => {
    const config = makeConfig();
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config);
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
    proc.consentGate.grant();
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });

  it('commitSession is a no-op in normal mode', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig());
    proc.onEnd(makeSpan());
    proc.commitSession(0); // rate=0, but shouldn't affect normal mode
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });
});

// ─── Error-aware mode ────────────────────────────────────────────────────────

describe('BlindspotSpanProcessor — errorAware mode', () => {
  it('buffers spans until commitSession is called', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }));
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0); // still buffered
  });

  it('flushes session buffer when rate=1 and no error', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true, rate: 1 }));
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    proc.commitSession(1);
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(2);
  });

  it('drops session buffer when rate=0 and no error', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true, rate: 0 }));
    proc.onEnd(makeSpan());
    proc.onEnd(makeSpan());
    proc.commitSession(0);
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
  });

  it('flushes everything when error detected, regardless of rate', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true, rate: 0 }));
    proc.onEnd(makeSpan('before-error'));
    proc.onEnd(makeSpan('error-span', SpanStatusCode.ERROR));
    proc.onEnd(makeSpan('after-error'));
    proc.commitSession(0); // rate=0 should be overridden by error flag
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(3);
  });

  it('flushes buffered spans immediately when error span arrives', async () => {
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true, rate: 0 }));
    proc.onEnd(makeSpan('span-1'));
    proc.onEnd(makeSpan('span-2'));
    // Error arrives — buffered spans should be routed to batch right now
    proc.onEnd(makeSpan('error-span', SpanStatusCode.ERROR));
    await proc.forceFlush();
    // All three exported even before commitSession
    expect(exporter.exported).toHaveLength(3);
  });

  it('uses Math.random() to decide when rate is between 0 and 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }));
    proc.onEnd(makeSpan());
    proc.commitSession(0.5); // 0.4 < 0.5 → in sample → flush
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it('drops session when random roll exceeds rate', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, makeConfig({ errorAware: true }));
    proc.onEnd(makeSpan());
    proc.commitSession(0.5); // 0.9 > 0.5 → not in sample → drop
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('routes consent-buffered spans through error-aware logic on grant', async () => {
    const config = makeConfig({ errorAware: true, rate: 0 });
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config);
    proc.onEnd(makeSpan('before-consent'));
    // Grant consent — span moves to sessionBuffer (no error yet)
    proc.consentGate.grant();
    proc.commitSession(0); // rate=0, no error → drop
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(0);
  });

  it('consent-buffered error span triggers immediate flush on grant', async () => {
    const config = makeConfig({ errorAware: true, rate: 0 });
    config.privacy.consentRequired = true;
    const exporter = makeExporter();
    const proc = new BlindspotSpanProcessor(exporter, config);
    proc.onEnd(makeSpan('before-consent', SpanStatusCode.ERROR));
    proc.consentGate.grant(); // error span routes through _route → hasError = true → immediate flush
    await proc.forceFlush();
    expect(exporter.exported).toHaveLength(1);
  });
});
