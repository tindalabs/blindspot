import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { setServiceName } from '../../core/src/tracer.js';
import { _resetContextForTesting } from '../src/context.js';

let _exporter: InMemorySpanExporter;

export function setupOTel(): InMemorySpanExporter {
  _exporter = new InMemorySpanExporter();
  const provider = new WebTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(_exporter)],
  });
  provider.register();
  setServiceName('test');
  return _exporter;
}

export function resetState(): void {
  _exporter?.reset();
  _resetContextForTesting();
}

export function getSpans() {
  return _exporter.getFinishedSpans();
}

export function makeConfig(overrides = {}) {
  return {
    privacy: {
      maskInputs: true,
      blockSelectors: [] as string[],
      piiPatterns: [] as RegExp[],
      scrubAttributes: [] as string[],
      consentRequired: false,
    },
    sampling: { rate: 1.0 },
    instrument: {
      routing: true,
      clicks: true,
      forms: true,
      fetch: true,
      vitals: true,
      errors: true,
    },
    endpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'test',
    ...overrides,
  };
}
