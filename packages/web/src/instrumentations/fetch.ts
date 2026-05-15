import { getTracer } from '@tindalabs/blindspot-core';
import { propagation, context, trace, SpanStatusCode } from '@opentelemetry/api';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteContext, getLastInteractionLabel } from '../context.js';

function getPathname(url: string): string {
  try {
    return new URL(url, location.origin).pathname;
  } catch {
    return url;
  }
}

function mergeHeaders(
  existing: HeadersInit | undefined,
  injected: Record<string, string>,
): Record<string, string> {
  if (!existing) return injected;
  if (existing instanceof Headers) {
    return { ...Object.fromEntries(existing.entries()), ...injected };
  }
  if (Array.isArray(existing)) {
    return { ...Object.fromEntries(existing), ...injected };
  }
  return { ...(existing as Record<string, string>), ...injected };
}

export function initFetch(config: ResolvedConfig): void {
  const _original = window.fetch.bind(window);
  const endpointHref = (() => {
    try { return new URL(config.endpoint, location.origin).href; } catch { return config.endpoint; }
  })();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    // Don't instrument the OTLP export calls — avoids self-instrumentation loop
    try {
      if (new URL(url, location.origin).href === endpointHref) return _original(input, init);
    } catch { /* malformed URL — proceed with instrumentation */ }

    const method = (
      init?.method ??
      (input instanceof Request ? input.method : 'GET') ??
      'GET'
    ).toUpperCase();

    const t0 = Date.now();

    const span = getTracer().startSpan(
      `${method} ${getPathname(url)}`,
      {
        attributes: {
          'http.request.method': method,
          'url.full': url,
          'ux.api.triggered_by': getLastInteractionLabel(),
        },
      },
      getRouteContext(),
    );

    const spanCtx = trace.setSpan(context.active(), span);
    const carrier: Record<string, string> = {};
    propagation.inject(spanCtx, carrier);

    const mergedInit: RequestInit = {
      ...init,
      headers: mergeHeaders(init?.headers, carrier),
    };

    try {
      const response = await _original(
        input instanceof Request ? new Request(input, mergedInit) : url,
        mergedInit,
      );
      span.setAttribute('http.response.status_code', response.status);
      span.setAttribute('ux.api.user_wait_ms', Date.now() - t0);
      if (response.status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
      }
      return response;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (err instanceof Error) span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  };
}
