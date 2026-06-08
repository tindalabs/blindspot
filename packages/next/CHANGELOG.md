# @tindalabs/blindspot-next

## 0.1.2

### Patch Changes

- 2003457: Fix: in-route activity (clicks, fetch, errors, form submits) now nests under the
  navigation span instead of orphaning into its own root trace.

  The Vue, Svelte, and Next.js (pages-router) integrations cleared the route span
  in a step separate from re-creating it — Vue/Svelte in a `beforeEach` /
  `beforeNavigate` guard, the Next pages-router on `routeChangeStart` — leaving a
  window where the active context was root. Any span started in that window (and
  intermittently the navigation-triggering click) became a standalone root trace.
  The clear and re-create now happen atomically when the new route span is
  established (`afterEach` / `afterNavigate` / `routeChangeComplete`), so a route
  span is active at all times — matching the React and Next app-router adapters.

## 0.1.1

### Patch Changes

- 39cbbfe: Add a per-package README (with badges and quick-start) so each package has proper docs on its npm page. No runtime or API changes.
- Updated dependencies [39cbbfe]
  - @tindalabs/blindspot@0.1.1

## 0.1.0

### Minor Changes

- 682f005: Initial public release (0.1.0).

  Privacy-first OpenTelemetry UX-telemetry SDK for the web, with framework
  adapters for React, Next.js, Svelte, and Vue. Ships browser instrumentations
  (clicks, forms, routing, errors, fetch/XHR with W3C traceparent injection,
  Web Vitals, page lifecycle, and behavioral signals), a configurable privacy
  layer (input masking, PII scrubbing, consent gating), and error-aware sampling.

### Patch Changes

- Updated dependencies [682f005]
  - @tindalabs/blindspot@0.1.0
