import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { InMemorySpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
// Core source, not the built package: these tests exercise the real export path
// (BlindspotSpanProcessor redaction) as it exists in this checkout.
import { init as coreInit, getProcessor } from '../../core/src/init.js';
import { resolveConfig, type BlindspotConfig } from '../../core/src/config.js';
import { initClicks } from '../src/instrumentations/clicks.js';
import { initFetch } from '../src/instrumentations/fetch.js';
import { _resetContextForTesting } from '../src/context.js';

// End-to-end privacy guarantee: a configured piiPatterns match must not reach the
// exporter anywhere in the span, including its name, which redaction never touches.

const EMAIL = /[\w.+-]+@[\w-]+\.\w{2,}/;
const SECRET = 'alice@example.com';

const config: BlindspotConfig = {
  serviceName: 'privacy-test',
  endpoint: 'http://localhost:4318/v1/traces',
  privacy: { piiPatterns: [EMAIL] },
};

let exporter: InMemorySpanExporter;

beforeAll(() => {
  exporter = new InMemorySpanExporter();
  coreInit(config, exporter);
  window.fetch = (() => Promise.resolve(new Response(null, { status: 200 }))) as typeof fetch;
  const resolved = resolveConfig(config);
  initClicks(resolved);
  initFetch(resolved);
});

afterEach(() => {
  exporter.reset();
  _resetContextForTesting();
  document.body.innerHTML = '';
});

async function exportedSpans(): Promise<ReadableSpan[]> {
  const processor = getProcessor();
  if (!processor) throw new Error('Blindspot core was not initialized');
  await processor.forceFlush();
  return exporter.getFinishedSpans();
}

/** Every string the exporter would serialize from a span's name, attributes and events. */
function exportedStrings(span: ReadableSpan): string[] {
  const values = (attrs: ReadableSpan['attributes'] | undefined): string[] =>
    Object.values(attrs ?? {}).flatMap((v) => (Array.isArray(v) ? v : [v])).map(String);
  return [
    span.name,
    ...values(span.attributes),
    ...span.events.flatMap((event) => [event.name, ...values(event.attributes)]),
  ];
}

describe('PII never reaches the exporter', () => {
  it('a click label matching piiPatterns appears nowhere in the exported span', async () => {
    const button = document.createElement('button');
    button.textContent = `Send to ${SECRET}`;
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const [span] = await exportedSpans();
    expect(span).toBeDefined();
    expect(exportedStrings(span).join('\n')).not.toContain(SECRET);
  });

  it('a fetch path matching piiPatterns appears nowhere in the exported span', async () => {
    await window.fetch(`/api/users/${SECRET}/orders`);

    const [span] = await exportedSpans();
    expect(span).toBeDefined();
    expect(exportedStrings(span).join('\n')).not.toContain(SECRET);
  });
});
