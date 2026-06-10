# @tindalabs/blindspot-core

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
