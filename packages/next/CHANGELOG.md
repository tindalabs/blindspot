# @tindalabs/blindspot-next

## 0.2.0

### Minor Changes

- ab799d1: Span names no longer contain user-visible text or URLs. `privacy.piiPatterns` redacts attribute values but never span names, so labels and paths embedded in names were exported unredacted.

  **Breaking for queries that match on full span names:**

  | Span  | Before                         | After          | Specifics now only in          |
  | ----- | ------------------------------ | -------------- | ------------------------------ |
  | Route | `navigation /cart → /checkout` | `navigation`   | `ux.route.from`, `ux.route.to` |
  | Click | `click button[Place Order]`    | `click button` | `ux.element.label`             |
  | Fetch | `POST /api/orders`             | `POST`         | `url.full`                     |

  Queries that match on name prefixes, such as the bundled Grafana dashboard's `{span:name=~"navigation.*"}`, keep working. Filter on the attributes above instead of the name.

  New: `beginRouteSpan({ from, to, trigger }, parentContext?)` ends the current route span and starts the next one. All framework integrations now use it, so route spans have the same shape everywhere.

### Patch Changes

- 8e2d440: Type declarations now resolve correctly in every TypeScript module resolution mode.

  - `@tindalabs/blindspot-svelte`: CommonJS consumers using `moduleResolution: "node16"` or `"nodenext"` received the ESM declarations for the CommonJS build. They now get `index.d.cts`.
  - `@tindalabs/blindspot-react/react-router`: projects using `moduleResolution: "node"` found no types for this subpath. They do now.
  - All packages: each `import` and `require` condition names its own declaration file. The previous `types` condition came last and was never matched; types resolved only through files that happened to sit next to the JavaScript.

- ab799d1: Remove `loadRouteContextAfterReload()`. Continuing a trace across page reloads was turned off earlier because the parent span, sent by a `pagehide` beacon, often never reached the backend, which left the reloaded page's trace orphaned. Since then nothing saved the context, so this function always returned `undefined`. Each page load starts a new trace, as before. If you called it, delete the call.
- Updated dependencies [8e2d440]
- Updated dependencies [ab799d1]
- Updated dependencies [1dee5db]
- Updated dependencies [ab799d1]
- Updated dependencies [ab799d1]
- Updated dependencies [c0f1238]
  - @tindalabs/blindspot@0.2.0

## 0.1.3

### Patch Changes

- @tindalabs/blindspot@0.1.2

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
