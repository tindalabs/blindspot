import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { type InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { setupOTel, makeConfig } from './helpers.js';
import { initErrors } from '../src/instrumentations/errors.js';
import { _resetContextForTesting } from '../src/context.js';

let exporter: InMemorySpanExporter;

beforeAll(() => {
  exporter = setupOTel();
  initErrors(makeConfig() as ReturnType<typeof makeConfig>);
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
});

// Simulate an unhandledrejection without PromiseRejectionEvent (not in happy-dom)
function fireUnhandledRejection(reason: unknown): void {
  const event = Object.assign(new Event('unhandledrejection'), { reason });
  window.dispatchEvent(event);
}

describe('initErrors', () => {
  it('creates a span for window.onerror', () => {
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'Something went wrong', error: new TypeError() }),
    );
    const [span] = exporter.getFinishedSpans();
    expect(span).toBeDefined();
    expect(span.name).toBe('error.unhandled');
  });

  it('records the error type from the constructor name', () => {
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'oops', error: new RangeError('out of range') }),
    );
    const [span] = exporter.getFinishedSpans();
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc?.attributes?.['exception.type']).toBe('RangeError');
  });

  it('sets span status to ERROR', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'fail', error: new Error() }));
    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
  });

  it('creates a span for unhandledrejection', () => {
    fireUnhandledRejection(new Error('async fail'));
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('error.unhandled_rejection');
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc?.attributes?.['exception.type']).toBe('UnhandledRejection');
  });

  it('sanitizes URLs out of error messages', () => {
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Failed to load https://api.example.com/data?token=secret',
        error: new Error(),
      }),
    );
    const [span] = exporter.getFinishedSpans();
    const exc = span.events.find((e) => e.name === 'exception');
    expect(exc?.attributes?.['exception.message']).not.toContain('https://');
    expect(exc?.attributes?.['exception.message']).toContain('[url]');
  });

  it('truncates error messages to 256 characters', () => {
    const long = 'x'.repeat(300);
    window.dispatchEvent(new ErrorEvent('error', { message: long, error: new Error() }));
    const [span] = exporter.getFinishedSpans();
    const exc = span.events.find((e) => e.name === 'exception');
    expect((exc?.attributes?.['exception.message'] as string).length).toBeLessThanOrEqual(256);
  });
});
