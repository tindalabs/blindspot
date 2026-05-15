# Getting Started

Blindspot is a privacy-first frontend observability SDK that emits structured
OpenTelemetry spans from user interactions. It builds on the official OTel JS SDK,
adding a privacy layer, semantic enrichment, and framework integrations on top.

## Prerequisites

- Node.js 18+ and pnpm / npm / yarn
- An OTel-compatible backend (Grafana Tempo, Jaeger, Honeycomb, Datadog, …)

For local development, the fastest path is the included Docker stack — no account
required.

## Installation

```bash
# Auto-instrumentation for any web app (most users start here)
npm install @tindalabs/blindspot

# Framework integrations — pick the one that matches your stack
npm install @tindalabs/blindspot-react   # React + React Router v6 / TanStack Router
npm install @tindalabs/blindspot-vue     # Vue 3 + Vue Router 4
npm install @tindalabs/blindspot-next    # Next.js App Router or Pages Router
```

## Quickstart — vanilla JS

```typescript
import { init } from '@tindalabs/blindspot'

init({
  serviceName: 'my-app',
  endpoint: 'http://localhost:4318/v1/traces', // OTel Collector OTLP/HTTP
  privacy: { consentRequired: false },
})
```

That single call enables automatic instrumentation for:

- **Route changes** — every History API navigation becomes a root span
- **Clicks** — including rage-click and dead-click detection
- **Form submissions** — validity state and attempt count, never field values
- **Fetch calls** — latency, status code, user-perceived wait time
- **Web Vitals** — LCP, CLS, INP attached as events on the route span
- **Errors** — unhandled exceptions and promise rejections (sanitized)

## Local dev stack (zero config)

The repo ships a `docker-compose.yml` that stands up a full observability stack
in one command:

```bash
docker compose up -d
```

This starts:

| Service | URL |
|---|---|
| OTel Collector (OTLP/HTTP) | `http://localhost:4318` |
| Grafana Tempo | internal |
| Grafana UI | `http://localhost:3100` |

Point your app at `http://localhost:4318/v1/traces` and open Grafana to see traces
appear within seconds.

## What happens next

Once `init()` is called, every user interaction in the browser automatically
produces a structured OpenTelemetry span tree:

```
Trace (session)
│
├── Span: navigation → /checkout          ← root span per route
│   ├── Span: click "Add to cart"
│   ├── Span: POST /api/cart              ← correlated with backend via traceparent
│   └── Span: click "Retry"
│
└── Span: navigation → /order-confirm
    └── Event: lcp (1.2s)
```

The `traceparent` W3C header is injected automatically into every fetch call, so
the backend trace (in any language) becomes a child of the frontend span.

## Framework quickstarts

Jump directly to the integration guide for your framework:

- [React →](/framework/react)
- [Vue →](/framework/vue)
- [Next.js →](/framework/next)
