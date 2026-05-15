import type { Context, Span, SpanContext } from '@opentelemetry/api';
import { context, trace } from '@opentelemetry/api';

const RELOAD_CTX_KEY = 'blindspot.reload_ctx';

let _routeSpan: Span | undefined;
let _routeContext: Context = context.active();
let _lastInteractionLabel = '';

export function setRouteSpan(span: Span): void {
  _routeSpan = span;
  _routeContext = trace.setSpan(context.active(), span);
}

export function getRouteSpan(): Span | undefined {
  return _routeSpan;
}

export function getRouteContext(): Context {
  return _routeContext;
}

export function clearRouteSpan(): void {
  _routeSpan?.end();
  _routeSpan = undefined;
  _routeContext = context.active();
}

export function setLastInteractionLabel(label: string): void {
  _lastInteractionLabel = label;
}

export function getLastInteractionLabel(): string {
  return _lastInteractionLabel;
}

// Returns the W3C traceparent of the currently active route span, or null if
// no route span is set. Pass this as traceparentProvider to @irregular/scent-sdk
// so identity snapshots carry the blindspot page trace ID.
export function getSessionTraceparent(): string | null {
  if (!_routeSpan) return null;
  const sc = _routeSpan.spanContext();
  if (sc.traceId.length !== 32 || sc.spanId.length !== 16) return null;
  const flags = (sc.traceFlags & 0xff).toString(16).padStart(2, '0');
  return `00-${sc.traceId}-${sc.spanId}-${flags}`;
}

export function saveRouteContextForReload(): void {
  if (!_routeSpan) return;
  const sc = _routeSpan.spanContext();
  if (sc.traceId.length !== 32 || sc.spanId.length !== 16) return;
  try {
    const flags = (sc.traceFlags & 0xff).toString(16).padStart(2, '0');
    sessionStorage.setItem(RELOAD_CTX_KEY, `00-${sc.traceId}-${sc.spanId}-${flags}`);
  } catch { /* sessionStorage unavailable */ }
}

export function loadRouteContextAfterReload(): Context | undefined {
  try {
    const raw = sessionStorage.getItem(RELOAD_CTX_KEY);
    sessionStorage.removeItem(RELOAD_CTX_KEY);
    if (!raw) return undefined;
    const parts = raw.split('-');
    if (parts.length !== 4 || parts[0] !== '00') return undefined;
    const [, traceId, spanId, flags] = parts;
    if (traceId.length !== 32 || spanId.length !== 16) return undefined;
    const spanContext: SpanContext = {
      traceId,
      spanId,
      traceFlags: parseInt(flags, 16),
      isRemote: true,
    };
    return trace.setSpanContext(context.active(), spanContext);
  } catch {
    return undefined;
  }
}

export function _resetContextForTesting(): void {
  _routeSpan = undefined;
  _routeContext = context.active();
  _lastInteractionLabel = '';
}
