# Ledger

Open work: defects, doc drift, and deferred decisions. Each entry states where, what,
why it matters, and what "closed" means. Close an entry by deleting it in the same commit
as the fix; git history keeps the record.

Severity: **high** (wrong data or privacy exposure), **medium** (misleading docs or API),
**low** (naming, polish).

---

## L2: Reload trace continuation is dead code (high)

**Where:** [`packages/web/src/context.ts`](packages/web/src/context.ts),
[`packages/web/src/instrumentations/lifecycle.ts`](packages/web/src/instrumentations/lifecycle.ts)

`saveRouteContextForReload()` has no production caller (only tests call it). The React,
Vue, Svelte and Next integrations all call `loadRouteContextAfterReload()` on the initial
route, but because nothing writes the key, it always returns `undefined`. Also,
`lifecycle.ts` calls `clearRouteSpan()` on `pagehide`, so calling save *after* that would
also find no route span. Vanilla `initRouting` never calls load either, so the
integrations and the vanilla SDK disagree on intent.

A related question: `visibilitychange → hidden` also ends the route span. After the tab
becomes visible again there is no route span, so clicks and fetches start new **root**
traces until the next navigation. Confirm whether this is intended.

**Closed when:** a decision is recorded (continue traces across reloads, or not). If yes,
save runs before the route span ends on `pagehide`, vanilla routing uses it too, and an
integration test proves a reloaded page's route span shares the previous trace id. If
no, delete both functions and their callers. Separately, either decide and test the
tab-refocus behaviour or fix it.

## L3: ARCHITECTURE.md says "Session = Trace"; the code does Route = Trace (medium)

**Where:** [`ARCHITECTURE.md`](ARCHITECTURE.md), the "Semantic Model" section and the
"Key Technical Decisions" row `Session = Trace, Route = root Span`

`routing.ts` starts every navigation span with no parent, so each route is its own trace.
The session is joined only by the `ux.session.id` **resource** attribute. The code's
choice is the sound one: a trace that lasts a whole session never completes, breaks
backend trace-size and duration limits, and makes every fetch's backend trace a
descendant of one giant tree.

**Why it matters:** trace vs. session is the most common OTel beginner confusion, and
this doc teaches the wrong answer. Users writing TraceQL against "one trace per session"
get wrong results.

**Closed when:** the semantic model diagram and decision row describe one trace per
route, with the session joined by a resource attribute, and the reason. Also fix the
attribute-taxonomy example in the same section, which shows `ux.session.id` as a span
attribute (it is a resource attribute) and `http.url` (the code emits the current
semconv `url.full`).

## L4: Decision table claims wrappers the code does not use (medium)

**Where:** [`ARCHITECTURE.md`](ARCHITECTURE.md), the "Key Technical Decisions" rows for
`@opentelemetry/instrumentation-fetch` and `@opentelemetry/instrumentation-user-interaction`,
and the "(wraps OTel fetch)" label in the system diagram

Neither package is a dependency. Fetch and click instrumentation are hand-written in
`packages/web/src/instrumentations/`. The decision was reversed without a record.

**Closed when:** the table records the actual decision and its reason (likely: control
over attributes such as `ux.api.triggered_by`, the self-instrumentation guard on the OTLP
endpoint, and bundle size, but **measure and confirm** rather than assume), and the
diagram label matches.

## L5: `getSessionTraceparent()` returns the route's traceparent (low)

**Where:** [`packages/web/src/context.ts`](packages/web/src/context.ts), exported from
`@tindalabs/blindspot` and listed in `CHANGELOG.md`

It returns the traceparent of the current route span, which changes on every navigation.
The name repeats the L3 confusion. It is public API, so renaming it is a breaking change.

**Closed when:** `getRouteTraceparent()` is added, `getSessionTraceparent()` becomes a
deprecated alias with a JSDoc `@deprecated` note and a changeset, and it is removed at the
next minor release.

## L6: `ux.session.id` vs. the semconv `session.id` (low, needs a decision)

**Where:** [`packages/core/src/init.ts`](packages/core/src/init.ts)

OTel semantic conventions define `session.id` (the `session` namespace). `ROADMAP.md`
commits new UX signals to the `ux.*` namespace, but that rule targets concepts semconv
does not cover; session identity is already covered. Using a private key means generic
OTel tooling that understands `session.id` cannot group Blindspot sessions.

**Closed when:** a decision is recorded in ARCHITECTURE.md: emit `session.id` (possibly
alongside `ux.session.id` for one deprecation cycle), or keep `ux.session.id` with the
stated reason. Check the convention's current stability level before deciding.

## L7: Route templates for navigation and fetch spans (low)

**Where:** the adapters in `packages/{react,vue,svelte,next}/src/`, and
[`packages/web/src/context.ts`](packages/web/src/context.ts) (`beginRouteSpan`)

Route spans are named `navigation` and fetch spans just `{method}`, because raw paths
are high-cardinality and can carry PII. Several routers know the route *template*
(Vue `to.matched`, SvelteKit `route.id`, React Router matches), which is
low-cardinality and free of user data. Semconv allows `{method} {url.template}` for
HTTP client spans, and a `ux.route.template` attribute would let dashboards group
routes without regexes over paths.

**Closed when:** a decision is recorded on whether to add an optional `template` to
`RouteChange` (attribute only, or also in the name), and the adapters that can supply
one do, with tests. Vanilla routing and Next App Router have no template, so they keep
the plain name.
