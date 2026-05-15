import type { HrTime } from '@opentelemetry/api';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

type OtlpValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: OtlpValue[] } };

type OtlpAttr = { key: string; value: OtlpValue };

function hrToNanos(hr: HrTime): string {
  return (BigInt(hr[0]) * 1_000_000_000n + BigInt(hr[1])).toString();
}

function toOtlpValue(v: unknown): OtlpValue {
  if (typeof v === 'boolean') return { boolValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: (v as unknown[]).map(toOtlpValue) } };
  }
  return { stringValue: String(v) };
}

function serializeAttrs(attrs: Record<string, unknown>): OtlpAttr[] {
  return Object.entries(attrs).map(([key, value]) => ({ key, value: toOtlpValue(value) }));
}

function buildOtlpJson(spans: ReadableSpan[]): string {
  if (spans.length === 0) return '{"resourceSpans":[]}';

  const first = spans[0];
  const resourceAttrs = (first.resource?.attributes ?? {}) as Record<string, unknown>;

  const spansByScope = new Map<string, ReadableSpan[]>();
  for (const span of spans) {
    const name = span.instrumentationScope?.name ?? 'blindspot';
    const bucket = spansByScope.get(name) ?? [];
    bucket.push(span);
    spansByScope.set(name, bucket);
  }

  const scopeSpans = [...spansByScope.entries()].map(([scopeName, scopeSpans]) => ({
    scope: { name: scopeName },
    spans: scopeSpans.map((span) => ({
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanContext?.spanId,
      name: span.name,
      kind: span.kind,
      startTimeUnixNano: hrToNanos(span.startTime),
      endTimeUnixNano: hrToNanos(span.endTime),
      attributes: serializeAttrs(span.attributes as Record<string, unknown>),
      status: { code: span.status.code },
      events: span.events.map((e) => ({
        name: e.name,
        timeUnixNano: hrToNanos(e.time),
        attributes: serializeAttrs((e.attributes ?? {}) as Record<string, unknown>),
      })),
    })),
  }));

  return JSON.stringify({
    resourceSpans: [{ resource: { attributes: serializeAttrs(resourceAttrs) }, scopeSpans }],
  });
}

export class BeaconExporter implements SpanExporter {
  private _useBeacon = false;

  constructor(
    private readonly _inner: SpanExporter,
    private readonly _url: string,
  ) {}

  useBeaconForNextExport(): void {
    this._useBeacon = true;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (!this._useBeacon) {
      this._inner.export(spans, resultCallback);
      return;
    }
    this._useBeacon = false;
    const body = buildOtlpJson(spans);
    const sent = navigator.sendBeacon(this._url, new Blob([body], { type: 'application/json' }));
    resultCallback({ code: sent ? ExportResultCode.SUCCESS : ExportResultCode.FAILED });
  }

  shutdown(): Promise<void> {
    return this._inner.shutdown();
  }
}
