import { SpanStatusCode, type Context } from '@opentelemetry/api';
import {
  BatchSpanProcessor,
  type Span,
  type ReadableSpan,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import type { ResolvedConfig } from './config.js';
import { sanitizeAttributes, sanitizeEvents } from './privacy/redactor.js';
import { ConsentGate } from './privacy/consent.js';

function sanitizedView(span: ReadableSpan, config: ResolvedConfig): ReadableSpan {
  const sanitizedAttributes = sanitizeAttributes(span.attributes, config.privacy);
  const sanitizedEvents = sanitizeEvents(span.events, config.privacy);
  return new Proxy(span, {
    get(target, prop: string | symbol) {
      if (prop === 'attributes') return sanitizedAttributes;
      if (prop === 'events') return sanitizedEvents;
      const val = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(target) : val;
    },
  });
}

export class BlindspotSpanProcessor implements SpanProcessor {
  private readonly _consentBuffer: ReadableSpan[] = [];
  private readonly _sessionBuffer: ReadableSpan[] = [];
  private readonly _batch: BatchSpanProcessor;
  readonly consentGate: ConsentGate;
  private _hasError = false;
  private readonly _errorAware: boolean;

  constructor(
    exporter: SpanExporter,
    private readonly _config: ResolvedConfig,
    private readonly _sessionSampled: boolean,
  ) {
    this._batch = new BatchSpanProcessor(exporter);
    this._errorAware = _config.sampling.errorAware;
    this.consentGate = new ConsentGate();

    if (!_config.privacy.consentRequired) {
      this.consentGate.grant();
    }

    this.consentGate.onChange((granted) => {
      if (granted) this._flushConsentBuffer();
    });
  }

  onStart(span: Span, parentContext: Context): void {
    this._batch.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    const sanitized = sanitizedView(span, this._config);
    if (!this.consentGate.isGranted()) {
      this._consentBuffer.push(sanitized);
      return;
    }
    this._route(sanitized);
  }

  private _route(span: ReadableSpan): void {
    if (!this._errorAware) {
      this._batch.onEnd(span);
      return;
    }

    if (span.status.code === SpanStatusCode.ERROR) {
      this._hasError = true;
    }

    if (this._hasError) {
      // Flush any buffered session spans first, then route directly.
      const pending = this._sessionBuffer.splice(0);
      for (const s of pending) this._batch.onEnd(s);
      this._batch.onEnd(span);
    } else {
      this._sessionBuffer.push(span);
    }
  }

  private _flushConsentBuffer(): void {
    const spans = this._consentBuffer.splice(0);
    for (const s of spans) this._route(s);
  }

  /**
   * Called when the page is hidden, when errorAware is enabled. Exports the
   * buffered spans if an error was seen or the session is in the sample;
   * otherwise drops them. The same session-level decision applies on every hide.
   */
  commitSession(): void {
    if (!this._errorAware) return;
    if (this._hasError || this._sessionSampled) {
      const spans = this._sessionBuffer.splice(0);
      for (const s of spans) this._batch.onEnd(s);
    } else {
      this._sessionBuffer.splice(0);
    }
  }

  forceFlush(): Promise<void> {
    return this._batch.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._batch.shutdown();
  }
}
