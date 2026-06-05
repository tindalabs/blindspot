# @tindalabs/blindspot-core

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot-core.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-core)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot-core.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-core)

The shared engine behind [Blindspot](https://github.com/tindalabs/blindspot): the OpenTelemetry provider setup, the privacy/redaction layer, and the consent gate.

> **Most users don't install this directly.** Install [`@tindalabs/blindspot`](https://www.npmjs.com/package/@tindalabs/blindspot) (which depends on this) or a framework adapter. Use `-core` only when building a custom instrumentation package on top of Blindspot.

```bash
npm install @tindalabs/blindspot-core
```

## What it provides

- **`init(config)`** — sets up the `WebTracerProvider`, sampler, OTLP exporter, and the Blindspot span processor.
- **Privacy engine** — `sanitizeAttributes`, `isElementBlocked`, `getElementLabel`, `isLabelSensitive`, `scrubDynamicSegments`. Span attributes are sanitized at export time against your `PrivacyConfig`.
- **Consent gate** — `ConsentGate`, `grantConsent()`, `revokeConsent()`. When `consentRequired`, spans buffer in memory until consent is granted.
- **`getTracer()` / `recordEvent()`** — tracer access and active-span events.

## Docs

[API reference](https://github.com/tindalabs/blindspot/blob/main/SDK_API.md) · [Architecture & privacy model](https://github.com/tindalabs/blindspot/blob/main/ARCHITECTURE.md)

## The Tindalabs stack

| Package | What it does |
|---|---|
| **[@tindalabs/blindspot](https://github.com/tindalabs/blindspot)** | Privacy-first OTel frontend observability |
| **[@tindalabs/shield](https://github.com/tindalabs/shield)** | Tamper detection & content protection |
| **[@tindalabs/scent](https://github.com/tindalabs/scent)** | Probabilistic identity continuity |

## License

MIT
