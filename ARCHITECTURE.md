# Blindspot — Architecture

> Observability without surveillance.

Blindspot is a privacy-first frontend observability SDK that emits structured
OpenTelemetry spans from user interactions. It builds on top of the official
OTel JS SDK rather than reinventing it — adding a privacy layer, semantic
enrichment, opinionated defaults, and framework integrations.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (SDK)                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  @tindalabs/blindspot                 │   │
│  │                                                 │   │
│  │  ┌──────────────┐    ┌─────────────────────┐   │   │
│  │  │   Privacy    │    │  Auto-Instrumenta-  │   │   │
│  │  │   Engine     │    │       tions         │   │   │
│  │  │              │    │                     │   │   │
│  │  │ - PII redact │    │ - RouteInstrumentation│  │   │
│  │  │ - Input block│    │ - ClickInstrumentation│  │   │
│  │  │ - Selector   │    │ - FormInstrumentation │  │   │
│  │  │   masking    │    │ - FetchInstrumentation│  │   │
│  │  │ - Consent    │    │   (wraps OTel fetch) │   │   │
│  │  │   hooks      │    │ - VitalsInstrumentation│  │   │
│  │  │              │    │ - ErrorInstrumentation│  │   │
│  │  └──────┬───────┘    └──────────┬──────────┘   │   │
│  │         └──────────┬────────────┘              │   │
│  │                    ▼                            │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │           @tindalabs/blindspot-core               │   │   │
│  │  │                                         │   │   │
│  │  │  OTel TracerProvider (sdk-trace-web)    │   │   │
│  │  │  Session context propagation            │   │   │
│  │  │  Semantic attribute enrichment          │   │   │
│  │  │  Sampler                                │   │   │
│  │  └────────────────────┬────────────────────┘   │   │
│  └───────────────────────┼─────────────────────────┘   │
│                          │ OTLP/HTTP (JSON, batched)    │
└──────────────────────────┼──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │     OTel Collector      │  ← optional but recommended
              │  (self-hosted or cloud) │
              │  - CORS termination     │
              │  - Enrichment           │
              │  - Routing              │
              └────────────┬────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     Grafana Tempo      Jaeger          Honeycomb
     (+ Grafana UI)     (OSS)           Datadog, etc.
```

---

## The Semantic Model

A user session maps to a **Trace**. The current route is a **root Span**. Every
interaction within that route is a **child Span**. This is the core semantic
decision that makes Blindspot data natively queryable in any OTel backend.

```
Trace (session)
│
├── Span: navigation → /checkout          ← root span per route
│   ├── Span: click "Add to cart"
│   ├── Span: POST /api/cart              ← correlated with backend via traceparent
│   │     └── Event: response.error (429)
│   ├── Span: click "Retry"
│   └── Span: POST /api/cart (success)
│
└── Span: navigation → /order-confirm
    └── Span: page.load
          └── Event: lcp (1.2s)
```

The `traceparent` W3C header is injected automatically into every fetch call,
so the backend trace (in any language) becomes a child of the frontend span.
Frontend and backend are visible as a single trace in Tempo or Jaeger.

---

## Span Attribute Taxonomy

OTel Semantic Conventions are used where they apply. UX-specific attributes
live under the `ux.*` namespace.

### Route span

```json
{
  "name": "navigation /cart → /checkout",
  "attributes": {
    "ux.route.from": "/cart",
    "ux.route.to": "/checkout",
    "ux.route.trigger": "user",
    "ux.session.id": "s_abc123",
    "ux.viewport.width": 1440,
    "ux.viewport.height": 900,
    "http.url": "https://app.example.com/checkout",
    "service.name": "storefront"
  }
}
```

### Interaction span

```json
{
  "name": "click button[Place Order]",
  "attributes": {
    "ux.interaction.type": "click",
    "ux.element.tag": "button",
    "ux.element.role": "button",
    "ux.element.label": "Place Order",
    "ux.element.disabled": false,
    "ux.rage_click": false,
    "ux.dead_click": false
  }
}
```

### API call span (frontend side, correlated with backend)

```json
{
  "name": "POST /api/orders",
  "attributes": {
    "http.method": "POST",
    "http.url": "/api/orders",
    "http.status_code": 422,
    "ux.api.user_wait_ms": 1840,
    "ux.api.triggered_by": "click button[Place Order]"
  },
  "events": [
    { "name": "request.sent" },
    {
      "name": "response.received",
      "attributes": { "status": 422, "body.hint": "validation_failed" }
    }
  ]
}
```

---

## Package Structure

| Package | Role |
|---|---|
| `@tindalabs/blindspot-core` | OTel TracerProvider wiring, privacy engine, session management |
| `@tindalabs/blindspot` | Auto-instrumentation bundle, `init()` — the main entry point |
| `@tindalabs/blindspot-react` | `BlindspotProvider`, `useSpan`, `BlindspotRoutes` |
| `@tindalabs/blindspot-vue` | `BlindspotPlugin`, `useBlindspot` composable |
| `@tindalabs/blindspot-next` | Next.js integration (handles SSR/RSC edge cases) |

`@tindalabs/blindspot` is what the majority of users install. Framework packages are
thin wrappers that wire up routing and expose idiomatic APIs.

---

## Privacy Model

Privacy is a first-class constraint, not a feature toggle.

| Principle | Implementation |
|---|---|
| No input content ever | Only `[type]`, `[name]`, `[aria-label]` captured — never value |
| Selector blocking | `data-blindspot-block` attr or `blockSelectors` config |
| PII redaction | Configurable regex list applied to all attribute values before export |
| Consent gating | Export buffered until `grantConsent()` is called |
| No DOM snapshots | Attributes describe semantics, never content |

All redaction happens in-browser before any data leaves the device.

---

## Infrastructure — Local Dev Stack

A reference `docker-compose.yml` ships with the repo. Running it gives:

- **OTel Collector** — receives OTLP/HTTP on port 4318 (CORS pre-configured)
- **Grafana Tempo** — stores traces
- **Grafana** — visualises traces at `localhost:3000`

This means a developer can run `docker compose up` and see their first traces
within minutes of installing the SDK. Demo-ability drives adoption.

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| Build on `@opentelemetry/sdk-trace-web` | Not reinventing tracing primitives |
| Wrap `@opentelemetry/instrumentation-fetch` | Backend correlation comes for free |
| Wrap `@opentelemetry/instrumentation-user-interaction` | Baseline click/event capture exists |
| OTLP/HTTP JSON transport | Most browser-compatible; works with any collector |
| Session = Trace, Route = root Span | Makes data natively queryable without custom tooling |
| W3C `traceparent` propagation | Frontend-to-backend trace stitching, zero backend changes needed |
