import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { AlwaysOnSampler, TraceIdRatioBasedSampler, type SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { BlindspotConfig } from './config.js';
import { resolveConfig } from './config.js';
import { getOrCreateSessionId } from './session.js';
import { BlindspotSpanProcessor } from './processor.js';
import { setServiceName } from './tracer.js';

let _processor: BlindspotSpanProcessor | undefined;
let _initialized = false;

export function init(config: BlindspotConfig, exporter?: SpanExporter): void {
  if (_initialized) {
    console.warn('[Blindspot] init() called more than once — ignoring.');
    return;
  }

  const resolved = resolveConfig(config);
  const sessionId = getOrCreateSessionId();

  const resource = resourceFromAttributes({
    'service.name': resolved.serviceName,
    'ux.session.id': sessionId,
  });

  const _exporter = exporter ?? new OTLPTraceExporter({ url: resolved.endpoint });
  _processor = new BlindspotSpanProcessor(_exporter, resolved);

  const sampler = resolved.sampling.errorAware
    ? new AlwaysOnSampler()
    : new TraceIdRatioBasedSampler(resolved.sampling.rate);

  const provider = new WebTracerProvider({
    resource,
    sampler,
    spanProcessors: [_processor],
  });

  provider.register();

  setServiceName(resolved.serviceName);
  _initialized = true;
}

export function getProcessor(): BlindspotSpanProcessor | undefined {
  return _processor;
}

export function _resetForTesting(): void {
  _initialized = false;
  _processor = undefined;
}
