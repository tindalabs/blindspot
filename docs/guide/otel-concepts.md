# OpenTelemetry Concepts, Through Blindspot

This page is for developers who are new to OpenTelemetry (OTel). It explains the
handful of OTel building blocks that a browser SDK needs, and points at the exact
Blindspot file where each one lives. Read it with the code open.

It assumes you have run the [local dev stack](./getting-started.md) and seen a trace in
Grafana. If you have not read the official
[OTel concepts overview](https://opentelemetry.io/docs/concepts/), skim it first; this
page is the "now show me real code" follow-up.

## The pipeline in one picture

```
 your code / auto-instrumentation
        │  tracer.startSpan(...)
        ▼
   Tracer ──► Span ──(end)──► SpanProcessor ──► SpanExporter ──► OTLP/HTTP
        ▲                       (batch, filter)    (serialize)       │
        │                                                            ▼
 TracerProvider (Resource + Sampler + Processors + Propagator)   Collector ──► Tempo ──► Grafana
```

Everything on the left runs in the browser. Everything on the right is the
`docker compose` stack.

## 1. TracerProvider: the wiring

**File:** [`packages/core/src/init.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/core/src/init.ts)

The `TracerProvider` is the object that owns all the configuration. You build it once,
call `register()`, and from then on any code can ask the global API for a tracer.
Blindspot's whole setup is about 40 lines, which makes it a good map of the moving parts:

```typescript
const provider = new WebTracerProvider({ resource, sampler, spanProcessors: [processor] })
provider.register({ propagator: new W3CTraceContextPropagator() })
```

`register()` matters: it installs this provider as the global one, so
`trace.getTracer(...)` in [`tracer.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/core/src/tracer.ts)
returns a real tracer. Before `register()`, the API hands out a no-op tracer, and spans
silently go nowhere. That is OTel's design: the `@opentelemetry/api` package is safe to
call even when no SDK is installed.

## 2. Resource: who is emitting

**File:** `init.ts`, `resourceFromAttributes(...)`

A **Resource** describes the *thing producing telemetry*, not any single operation.
Every span from this provider carries it. Blindspot sets two keys:

| Attribute | Meaning |
|---|---|
| `service.name` | Which app this is. The one attribute every backend expects. |
| `ux.session.id` | The browser tab session, from `sessionStorage`. |

Putting the session id on the Resource rather than on each span is deliberate: it is
constant for the life of the provider, which is exactly what a Resource is for.

## 3. Traces and spans: Blindspot's data model

A **span** is one timed operation with a name, start and end time, attributes, and
optional events. A **trace** is a tree of spans that share a `traceId`, linked by
parent/child relationships.

Blindspot's rule: **each route is one trace.** The navigation span is the root, and
clicks, form submits, fetches and errors during that route are its children.

```
Trace A                                  Trace B
navigation  to=/checkout  (root)         navigation  to=/done  (root)
├── click button  label="Place Order"    └── GET  url.full=/api/order/42
├── POST  url.full=/api/order
└── error.unhandled
```

Notice the span names: `navigation`, `click button`, `GET`. The specific route, label
and URL are attributes, not part of the name. OTel asks for **low-cardinality** span
names, meaning a small, fixed set of possible values, so backends can group and
aggregate by name. A name like `GET /api/order/42` creates one "kind" of operation
per order id. Keeping values in attributes is also what lets Blindspot's privacy
redaction reach them: it rewrites attribute values, never names.

A **session** is *not* a trace. Traces A and B above have different trace ids; what
links them is the `ux.session.id` Resource attribute. To see a whole session, query by
that attribute.

Why not one trace per session? A trace is meant to describe one bounded operation. A
session can last hours, never cleanly "ends", and would grow into a tree that backends
truncate or refuse. One trace per route keeps traces small and complete.

**Where it happens:** [`routing.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/instrumentations/routing.ts)
starts the root span with no parent context.
[`context.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/context.ts)
stores it, and `getRouteContext()` is what every other instrumentation passes as the
parent:

```typescript
getTracer().startSpan('click ...', { attributes }, getRouteContext())
```

### Attributes vs. events

- **Attributes** are key/value facts about the whole span (`http.response.status_code`).
- **Events** are timestamped points *inside* a span. Blindspot records web vitals as
  events on the route span
  ([`vitals.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/instrumentations/vitals.ts)):
  an LCP is something that happened at a moment during the route, not a property of the
  route as a whole.

### Status

`span.setStatus({ code: SpanStatusCode.ERROR })` marks a span as failed. Backends use
it for error rates. Blindspot sets it for HTTP responses `>= 400` and for unhandled
errors. Recording an exception does **not** set the status for you; you do both.

### Semantic conventions

OTel publishes [semantic conventions](https://opentelemetry.io/docs/specs/semconv/):
agreed attribute names so every tool understands the same data. Blindspot uses them where
they exist (`http.request.method`, `http.response.status_code`, `url.full`) and puts
UX-specific attributes it invented under `ux.*`. When you add an attribute, check
semconv first; a standard name is worth more than a clever one.

## 4. Context propagation: joining frontend and backend

**File:** [`fetch.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/instrumentations/fetch.ts)

This is the feature that makes frontend tracing worth doing. When the browser calls
your API, Blindspot adds a W3C `traceparent` header:

```
traceparent: 00-<32 hex trace id>-<16 hex span id>-01
```

Your backend's OTel SDK reads that header and makes its server span a child of the
browser's fetch span. Frontend and backend then appear as **one trace**.

The code does it by hand, which makes every step visible:

```typescript
const spanCtx = trace.setSpan(context.active(), span) // 1. a Context holding our span
const carrier: Record<string, string> = {}
propagation.inject(spanCtx, carrier)                  // 2. the Propagator writes headers
// 3. merge `carrier` into the request headers
```

Step 2 uses whichever propagator was passed to `provider.register()` in `init.ts`. That
is the W3C one here, which is why the header is named `traceparent`.

Two practical notes:

- **CORS.** For a cross-origin API, the server must allow the `traceparent` request
  header, or the browser blocks the request.
- **Self-instrumentation.** `fetch.ts` skips requests to the OTLP endpoint itself.
  Without that guard, exporting a span would create a span, which would be exported,
  which would create a span...

## 5. Sampler: whether to record at all

**File:** `init.ts`

A **Sampler** decides, when a span *starts*, whether it is recorded. This is **head
sampling**: the decision is made before anyone knows how the operation turns out.

- The usual choice is `TraceIdRatioBasedSampler(rate)`: the decision is derived from the
  trace id, so every span in a trace gets the same answer and traces are never half-kept.
- Blindspot cannot use it. With one trace per route, a per-trace decision keeps a random
  share of each session's routes, so every session in the backend has silent gaps.
  Instead `init.ts` decides once per session, from a hash of `ux.session.id`
  (`sampling.ts`), and installs `AlwaysOnSampler` or `AlwaysOffSampler` for the page.
  The lesson generalises: **sample on the unit you analyse.**

Blindspot's `errorAware` mode shows the limit of head sampling. "Keep this session if
an error happens later" cannot be decided at span start. So in that mode Blindspot
records everything (`AlwaysOnSampler`) and makes the keep-or-drop decision later, in the
span processor (next section). That is a form of **tail sampling**, normally done in the
Collector; Blindspot does a small version client-side to avoid shipping spans it will
discard.

## 6. SpanProcessor: what happens when a span ends

**File:** [`packages/core/src/processor.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/core/src/processor.ts)

A **SpanProcessor** gets two hooks: `onStart(span)` and `onEnd(span)`. The standard
`BatchSpanProcessor` queues ended spans and hands them to the exporter in batches,
which is far cheaper than one request per span.

Blindspot writes its own processor that *wraps* a `BatchSpanProcessor` and adds three
behaviours before spans reach it:

1. **Privacy redaction.** Span attributes and span-event attributes are passed through
   the configured `piiPatterns` and `scrubAttributes`. The processor does not modify the
   span; it hands the batch processor a read-only view whose `attributes` and `events`
   are the redacted copies.
2. **Consent gating.** Until consent is granted, ended spans are buffered, not exported.
3. **Error-aware buffering.** In `errorAware` mode, spans wait until an error is seen
   (then flush) or the page is hidden (then the session-level sample decides).

This is a useful pattern to learn: **compose with the standard processor rather than
reimplementing batching.**

## 7. Exporter: getting spans off the page

**Files:** `init.ts` (`OTLPTraceExporter`),
[`beacon.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/beacon.ts),
[`lifecycle.ts`](https://github.com/tindalabs/blindspot/blob/main/packages/web/src/instrumentations/lifecycle.ts)

The **exporter** serializes spans and sends them. Blindspot uses **OTLP over HTTP**,
OTel's native protocol, to the Collector at `/v1/traces`.

Browsers add a problem servers do not have: the page can disappear at any moment, and a
normal `fetch` started during unload is often cancelled. So when the page is hidden,
`lifecycle.ts` ends the open route span, forces a flush, and tells `BeaconExporter` to
use `navigator.sendBeacon`, which lets the request outlive the page. Delivery is still
best effort, not guaranteed: some beacons never arrive.

That is why Blindspot never parents a span on one sent this way. When the user comes
back to a hidden tab, a new route span starts as the root of a new trace, with
`ux.route.trigger` set to `resume`. A reloaded page likewise starts a fresh trace
instead of continuing the previous page's one, whose root span may be missing.

## 8. The Collector: the other half

**File:** [`infra/otel-collector.yaml`](https://github.com/tindalabs/blindspot/blob/main/infra/otel-collector.yaml)

The **Collector** is a separate process that receives, processes and forwards telemetry.
Its config always has the same three-stage shape, and the local one is about as small as
it gets:

```yaml
receivers:  { otlp: ... }          # accept OTLP/HTTP on :4318 (with CORS for the browser)
processors: { batch: }             # re-batch for efficiency
exporters:  { otlp: tempo:4317 }   # forward to Tempo
service:
  pipelines:
    traces: { receivers: [otlp], processors: [batch], exporters: [otlp] }
```

Why not send straight from the browser to Tempo? The Collector is where you terminate
CORS, add authentication, drop or rewrite attributes, sample, and switch backends
without redeploying the frontend. See [OTel Collector Setup](./collector.md).

## Exercises

1. Click around the example app, then find one trace in Grafana. Identify the root
   navigation span and its children. Which file created each one?
2. Add a backend with an OTel SDK, call it from the example app, and confirm its server
   span appears inside the browser's trace. If it does not, check the CORS note in
   section 4.
3. Set `sampling.rate` to `0.5` and reload a few times. Why do you never see a trace with
   the navigation span but missing its clicks?
4. Find every place `getRouteContext()` is used. What would change if `fetch.ts` used
   `context.active()` instead?
