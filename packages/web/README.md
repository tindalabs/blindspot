# @tindalabs/blindspot

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot.svg)](https://www.npmjs.com/package/@tindalabs/blindspot)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot.svg)](https://www.npmjs.com/package/@tindalabs/blindspot)

**Observability without surveillance** — an OpenTelemetry-native frontend SDK.

Blindspot emits structured OTel spans from every user interaction — route navigations, clicks, form submissions, fetch calls, errors, and Web Vitals. Outgoing requests carry a W3C `traceparent`, so frontend spans correlate with your backend traces. **No DOM snapshots. No PII. No session replay** — signals, not recordings.

```bash
npm install @tindalabs/blindspot
```

## Quick start

```ts
import { init } from '@tindalabs/blindspot'

init({
  endpoint: 'https://otel-collector.example.com/v1/traces',
  serviceName: 'storefront',
  privacy: { maskInputs: true },   // restrictive by default
  sampling: { rate: 1.0 },          // lower in production, e.g. 0.2
})
```

That's it — auto-instrumentation starts immediately. Point `endpoint` at any OTLP/HTTP collector (Grafana Tempo, Honeycomb, etc.).

## What gets instrumented

| Instrumentation | Span | Key attributes |
|---|---|---|
| `routing` | `navigation {from} → {to}` | `ux.route.from/to/trigger` |
| `clicks` | `click {tag}[{label}]` | `ux.element.label`, `ux.rage_click`, `ux.dead_click` |
| `forms` | `form.submit {name}` | `ux.form.name/valid/attempts` |
| `fetch` | `{METHOD} {path}` | `http.*`, `ux.api.user_wait_ms`, injected `traceparent` |
| `vitals` | events on route span | `lcp`, `cls`, `inp` |
| `errors` | `error.unhandled` | `error.type/message` (sanitized) |

Each is toggleable via `instrument: { ... }` (all on by default).

## Privacy by construction

- `maskInputs` (default `true`) — input content is never captured.
- `blockSelectors` / `data-blindspot-block` — exclude elements entirely.
- `piiPatterns` — strip patterns (card numbers, etc.) from all attribute values.
- `consentRequired` + `grantConsent()` / `revokeConsent()` — buffer spans until consent (GDPR).

```html
<div data-blindspot-block><input type="password" /></div>
<button data-blindspot-label="submit-order">Place Order — $49.99</button>
```

## Manual instrumentation

```ts
import { getTracer, recordEvent } from '@tindalabs/blindspot'

const span = getTracer().startSpan('checkout.address-validation')
span.setAttribute('ux.form.fields_count', 5)
span.end()

recordEvent('promo.applied', { code_type: 'percentage' })   // event on the active span
```

## Framework adapters

[`-react`](https://www.npmjs.com/package/@tindalabs/blindspot-react) · [`-next`](https://www.npmjs.com/package/@tindalabs/blindspot-next) · [`-vue`](https://www.npmjs.com/package/@tindalabs/blindspot-vue) · [`-svelte`](https://www.npmjs.com/package/@tindalabs/blindspot-svelte)

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
