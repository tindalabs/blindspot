import { getTracer } from '@tindalabs/blindspot-core';
import { SpanStatusCode } from '@opentelemetry/api';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteContext } from '../context.js';

const URL_PATTERN = /https?:\/\/[^\s)'"]+/g;
const FILE_PATTERN = /\/?[\w./\\-]+\.(js|ts|mjs|cjs)(:\d+)*/g;

function sanitize(message: string): string {
  return message.replace(URL_PATTERN, '[url]').replace(FILE_PATTERN, '[file]').slice(0, 256);
}

export function initErrors(_config: ResolvedConfig): void {
  window.addEventListener('error', (event) => {
    const span = getTracer().startSpan('error.unhandled', {}, getRouteContext());
    span.addEvent('exception', {
      'exception.type': event.error?.constructor?.name ?? 'Error',
      'exception.message': sanitize(event.message),
    });
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const span = getTracer().startSpan('error.unhandled_rejection', {}, getRouteContext());
    span.addEvent('exception', {
      'exception.type': 'UnhandledRejection',
      'exception.message': sanitize(String(event.reason)),
    });
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  });
}
