# @tindalabs/blindspot-core

## 0.2.0

### Minor Changes

- c0f1238: `sampling.rate` now samples whole sessions, as documented. It was applied per trace, and each route is its own trace, so at `rate: 0.5` every session exported a random half of its routes: funnels and session views had silent gaps. The decision now comes from a hash of `ux.session.id`, so a session is kept or dropped whole and keeps the same decision across reloads in the tab.

  `sampling.errorAware` had the same flaw: it rolled `Math.random()` on every page hide, so each tab switch kept or dropped the spans since the last hide independently. It now uses the same session-level decision.

  The processor's `commitSession()` no longer takes a `rate` argument; the decision is fixed when `init()` runs. Expect exported span volume to change for any `rate` below 1: the share of sessions stays the same, but every kept session is now complete.

### Patch Changes

- 8e2d440: Type declarations now resolve correctly in every TypeScript module resolution mode.

  - `@tindalabs/blindspot-svelte`: CommonJS consumers using `moduleResolution: "node16"` or `"nodenext"` received the ESM declarations for the CommonJS build. They now get `index.d.cts`.
  - `@tindalabs/blindspot-react/react-router`: projects using `moduleResolution: "node"` found no types for this subpath. They do now.
  - All packages: each `import` and `require` condition names its own declaration file. The previous `types` condition came last and was never matched; types resolved only through files that happened to sit next to the JavaScript.

- 1dee5db: Update the OpenTelemetry SDK to 2.12 (exporter 0.223), which pulls `@opentelemetry/core` 2.12.1 and resolves GHSA-8988-4f7v-96qf. `@opentelemetry/api` stays at `^1.9.1`, so no consumer-facing peer changes.
- ab799d1: Apply `privacy.piiPatterns` and `privacy.scrubAttributes` to span event attributes, not only span attributes. Previously, exception messages and stack traces recorded via `recordException` (including failed `fetch` calls) and attributes passed to `recordEvent` were exported unredacted.

  Also fix `piiPatterns` entries with the `/g` flag: they redacted only every other matching value because `RegExp#test` kept `lastIndex` between calls.

## 0.1.2

### Patch Changes

- 79f8108: Session id generation no longer falls back to `Math.random()`. It now prefers `crypto.randomUUID`, then a `crypto.getRandomValues`-based v4 UUID, leaving only a non-random monotonic id (`bs-<ts>-<n>`) as a last resort for runtimes with no Web Crypto at all. Resolves CodeQL `js/insecure-randomness`. The session id is a UX-telemetry marker rather than a security token, but there's no reason to keep weak randomness in the SDK.

## 0.1.1

### Patch Changes

- 39cbbfe: Add a per-package README (with badges and quick-start) so each package has proper docs on its npm page. No runtime or API changes.

## 0.1.0

### Minor Changes

- 682f005: Initial public release (0.1.0).

  Privacy-first OpenTelemetry UX-telemetry SDK for the web, with framework
  adapters for React, Next.js, Svelte, and Vue. Ships browser instrumentations
  (clicks, forms, routing, errors, fetch/XHR with W3C traceparent injection,
  Web Vitals, page lifecycle, and behavioral signals), a configurable privacy
  layer (input masking, PII scrubbing, consent gating), and error-aware sampling.
