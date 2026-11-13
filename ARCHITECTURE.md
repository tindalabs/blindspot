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
│  │  │  Session id (resource attribute)        │   │   │
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

Each **route** is a **Trace**: the route span is its root, and every interaction on
that route is a **child Span**. A user session is many traces, joined by the
`ux.session.id` **resource** attribute that every span in the tab carries. This is the
core semantic decision that makes Blindspot data natively queryable in any OTel backend.

```
Trace (one per route)
└── Span: navigation                  ux.route.to=/checkout   ← root span
    ├── Span: click button            ux.element.label="Add to cart"
    ├── Span: POST                    url.full=/api/cart      ← correlated with backend via traceparent
    │                                 http.response.status_code=429, status ERROR
    ├── Span: click button            ux.element.label="Retry"
    └── Span: POST                    url.full=/api/cart      (200)

Next trace (same session: same ux.session.id resource attribute)
└── Span: navigation                  ux.route.to=/order-confirm
      (event: lcp, web_vital.value=1200)
```

A trace is meant to describe one bounded operation. A trace that lasted a whole session
would never complete, would exceed backend limits on trace size and duration, and would
make every backend request a descendant of one giant tree. To see a session, filter by
`resource.ux.session.id`; to see one route, open its trace.

The `traceparent` W3C header is injected automatically into every fetch call,
so the backend trace (in any language) becomes a child of the frontend span.
Frontend and backend are visible as a single trace in Tempo or Jaeger.

---

## Span Attribute Taxonomy

OTel Semantic Conventions are used where they apply. UX-specific attributes
live under the `ux.*` namespace.

### Resource (on every span)

```json
{
  "service.name": "storefront",
  "ux.session.id": "s_abc123"
}
```

### Route span

```json
{
  "name": "navigation",
  "attributes": {
    "ux.route.from": "/cart",
    "ux.route.to": "/checkout",
    "ux.route.trigger": "user",
    "url.full": "https://app.example.com/checkout"
  },
  "events": [
    { "name": "lcp", "attributes": { "web_vital.value": 1200 } }
  ]
}
```

`ux.route.trigger` is one of `initial`, `user`, `back-forward`, or `resume` (the page
became visible again after its route span ended on hide). `url.full` is set by the
built-in History API routing; the framework adapters set only the `ux.route.*`
attributes. Web Vitals (`lcp`, `cls`, `inp`) are events on the route span.

### Interaction span

```json
{
  "name": "click button",
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
  "name": "POST",
  "status": { "code": "ERROR", "message": "HTTP 422" },
  "attributes": {
    "http.request.method": "POST",
    "url.full": "/api/orders",
    "http.response.status_code": 422,
    "ux.api.user_wait_ms": 1840,
    "ux.api.triggered_by": "Place Order"
  }
}
```

Any response with status 400 or above sets the span status to `ERROR`.

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
| Route = Trace (route span is the root); session = the `ux.session.id` resource attribute | A trace describes one bounded operation. A session-long trace never completes and breaks backend trace-size and duration limits; a resource attribute groups a session's traces in any OTel backend without custom tooling |
| W3C `traceparent` propagation | Frontend-to-backend trace stitching, zero backend changes needed |
| Low-cardinality span names (`navigation`, `click <tag>`, `{method}`); paths, labels and URLs only in attributes | `piiPatterns` redacts attribute values, never names, so any user text in a name would bypass it. Also OTel naming guidance: names group operations, attributes carry specifics |
| A new trace per page load and per return to a hidden tab (`ux.route.trigger: resume`); never parent on the previous page's span | The route span is ended on hide, the last reliable export point on mobile, and sent by beacon, which can be lost. A child of a lost span shows as an orphan with no root. Reload continuation was tried and reverted for this reason |
| The React and Next adapters support React 18 and 19 (peer `^18 \|\| ^19`); the workspace develops on 19 and a CI job reruns the adapters' type-check, unit tests and React/Next e2e on 18 | The peer range was `>=18`, which promised every future major while only one was tested. Both majors pass the full suite, and dropping 18 would break its users for no technical reason. A new major joins by widening the range and adding it to CI, not by default |
