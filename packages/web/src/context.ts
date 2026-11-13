import type { Context, Span } from '@opentelemetry/api';
import { context, trace } from '@opentelemetry/api';
import { getTracer } from '@tindalabs/blindspot-core';

let _routeSpan: Span | undefined;
let _currentRoute: RouteChange | undefined;
// The route whose span was ended because the page was hidden; resumed on return.
let _suspendedRoute: RouteChange | undefined;
let _routeContext: Context = context.active();
let _lastInteractionLabel = '';

export function setRouteSpan(span: Span): void {
  _routeSpan = span;
  _routeContext = trace.setSpan(context.active(), span);
}

/** 'resume': the page became visible again after its route span was ended on hide. */
export type RouteTrigger = 'initial' | 'user' | 'back-forward' | 'resume';

export interface RouteChange {
  from: string;
  to: string;
  trigger: RouteTrigger;
}

// Span names must be low-cardinality: route paths can carry identifiers (and PII,
// which redaction only removes from attribute values), so they live in ux.route.*
// attributes, never in the name.
const NAVIGATION_SPAN_NAME = 'navigation';

/**
 * End the current route span and start the next one as the new route span.
 * Every route span is a new root: one trace per route. Each page load starts
 * fresh rather than continuing the previous page's trace, because that parent was
 * sent by a pagehide beacon that may never arrive, leaving the child orphaned.
 */
export function beginRouteSpan(route: RouteChange): Span {
  clearRouteSpan();
  const span = getTracer().startSpan(
    NAVIGATION_SPAN_NAME,
    {
      attributes: {
        'ux.route.from': route.from,
        'ux.route.to': route.to,
        'ux.route.trigger': route.trigger,
      },
    },
  );
  setRouteSpan(span);
  _currentRoute = route;
  return span;
}

/**
 * End the route span because the page is being hidden, remembering the route so
 * resumeRouteSpan() can reopen it. The span must end here: mobile browsers often
 * discard a hidden page without firing pagehide, so this is the last reliable
 * moment to export it.
 */
export function suspendRouteSpan(): void {
  if (!_routeSpan) return;
  const route = _currentRoute;
  clearRouteSpan();
  _suspendedRoute = route;
}

/**
 * Reopen the suspended route as a new trace when the page is visible again, so
 * activity after returning nests under a route instead of each click and fetch
 * becoming its own root trace.
 */
export function resumeRouteSpan(): void {
  if (!_suspendedRoute || _routeSpan) return;
  const { to } = _suspendedRoute;
  _suspendedRoute = undefined;
  beginRouteSpan({ from: to, to, trigger: 'resume' });
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
  _currentRoute = undefined;
  _suspendedRoute = undefined;
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

export function _resetContextForTesting(): void {
  _routeSpan = undefined;
  _routeContext = context.active();
  _currentRoute = undefined;
  _suspendedRoute = undefined;
  _lastInteractionLabel = '';
}
