# Blindspot — Roadmap

> Observability without surveillance.

Check items off as they are completed. Phases are sequential — do not start
a phase until the previous one is shippable.

---

## Phase 1 — Core Foundation (`@tindalabs/blindspot-core`)

The OTel wiring, privacy engine, and session model. No auto-instrumentation yet.

### Repo setup
- [x] Init monorepo (pnpm workspaces + turborepo)
- [x] TypeScript config (strict, shared tsconfig)
- [x] ESLint + Prettier config
- [x] Vitest for unit tests
- [x] Changesets for versioning

### `@tindalabs/blindspot-core` package
- [x] Wrap `@opentelemetry/sdk-trace-web` TracerProvider
- [x] Wire OTLP/HTTP exporter (`@opentelemetry/exporter-trace-otlp-http`)
- [x] Implement session ID generation and propagation
- [x] Implement `init()` with typed config schema
- [x] Privacy engine
  - [x] Input content blocking (never capture `.value`)
  - [x] PII pattern redaction on attribute values
  - [x] Selector-based element blocking (`blockSelectors`, `data-blindspot-block`)
  - [x] `scrubAttributes` — list of HTML attribute names never included in span attributes
  - [x] Auto-block sensitive input types by default (`password`, `tel`, `email`)
- [x] Consent gate: buffer spans, expose `grantConsent()` / `revokeConsent()`
- [x] Sampler (head-based, rate configurable)
- [x] Unit tests for privacy engine (redaction, blocking, consent buffer)

---

## Phase 2 — Auto-Instrumentation (`@tindalabs/blindspot`)

The main user-facing package. Builds on core.

### Route instrumentation
- [x] Detect History API navigation (pushState / replaceState)
- [x] Detect popstate (back/forward)
- [x] Create root span per route, end on next navigation
- [x] Attach `ux.route.*` attributes
- [x] Session continuity on hard refresh — serialize active trace context to `sessionStorage`
      and rehydrate on `init()` so a page reload stays in the same trace

### Click instrumentation
- [x] Wrap click capture with semantic enrichment (own implementation, not OTel contrib)
- [x] Enrich with semantic element attributes (tag, role, aria-label)
- [x] Rage click detection (≥3 clicks within 500ms on same target)
- [x] Dead click detection (static heuristic: non-interactive element)
- [x] Respect `data-blindspot-block` and `blockSelectors`
- [x] Use `data-blindspot-label` over DOM text content

### Form instrumentation
- [x] Track `submit` events per form
- [x] Count submit attempts per form instance
- [x] Record validation state at submit time (valid / invalid)
- [x] Do not capture any field values

### Fetch instrumentation
- [x] Wrap `window.fetch` with OTel span creation
- [x] Inject W3C `traceparent` header on all outbound requests
- [x] Record `ux.api.user_wait_ms` (time from triggering click to response)
- [x] Record `ux.api.triggered_by` (label of last interaction span)

### Web Vitals instrumentation
- [x] Capture LCP, CLS, INP via `web-vitals` library
- [x] Attach as events on the current route span (not separate spans)

### Error instrumentation
- [x] Capture unhandled `window.onerror`
- [x] Capture unhandled promise rejections
- [x] Sanitize stack traces (strip file paths, query strings)
- [x] Do not capture error messages that may contain user input

### `@tindalabs/blindspot` bundle
- [x] Re-export `init()`, `tracer`, `recordEvent`, `grantConsent`, `revokeConsent`
- [x] Tree-shakeable exports (each instrumentation importable individually)
- [x] Bundle size: ~4.8 KB gzipped (Blindspot code only; OTel SDK is a shared peer dep)
- [x] Beacon API flush — use `navigator.sendBeacon` on `visibilitychange: hidden` so
      in-flight and buffered spans are not lost when the tab closes

---

## Phase 3 — Local Dev Stack

Makes the SDK immediately demonstrable. Ships alongside Phase 2.

- [x] `docker-compose.yml` with OTel Collector, Grafana Tempo, Grafana
- [x] OTel Collector config with CORS pre-configured for `localhost`
- [x] Grafana provisioning: datasource + a starter dashboard (route heatmap, error rate, API latency)
- [x] Example app (Vite + vanilla JS) that generates realistic traces
- [x] `README.md` — install → `docker compose up` → see traces in < 5 minutes

---

## Phase 4 — React Integration (`@tindalabs/blindspot-react`)

- [x] `<BlindspotProvider>` — initialises core, provides context
- [x] `<BlindspotRoutes>` — drop-in for `<Routes>`, traces navigations
- [x] `useSpan()` hook — returns `{ addEvent, setAttribute }` for current span
- [x] Support React Router v6
- [x] Support TanStack Router (via generic `useBlindspotNavigate(pathname, search)` hook)
- [x] Unit tests (React Testing Library)
- [x] Example app updated with React integration (`examples/react-basic/`)

---

## Phase 5 — Vue Integration (`@tindalabs/blindspot-vue`)

- [x] `BlindspotPlugin` — Vue plugin, calls `init()` internally
- [x] `useBlindspot()` composable — returns `{ addEvent, setAttribute, startSpan }`
- [x] Auto-instrument Vue Router navigation guards
- [x] Unit tests (Vue Test Utils)
- [x] Example app added for Vue 3

---

## Phase 6 — Next.js Integration (`@tindalabs/blindspot-next`)

- [x] Handle SSR: only initialise SDK on client
- [x] Handle RSC: no-op safe imports for server components
- [x] App Router: instrument `next/navigation` route changes
- [x] Pages Router: instrument `next/router` events
- [x] Example app (Next.js App Router)

---

## Phase 7 — Developer Experience & Docs

- [x] Full documentation site (VitePress) — `docs/`, run with `pnpm docs:dev`
  - [x] Getting started guide
  - [x] Configuration reference (mirrors `SDK_API.md`)
  - [x] Privacy guide (what is and is not captured)
  - [x] OTel Collector setup guide
  - [x] Grafana dashboard walkthrough
  - [x] Framework integration guides (React, Vue, Next.js, Svelte)
- [x] Automated bundle size tracking (size-limit) — `pnpm size` → 4.22 KB gzipped
- [ ] Publish Grafana dashboard to grafana.com/dashboards
- [ ] Publish OTel Collector contrib recipe

---

## Phase 8 — Hardening & Advanced Features

### Semantic conventions
- [x] Align HTTP attributes with stable OTel semconv — `http.request.method`, `url.full`,
      `http.response.status_code` (was `http.method`, `http.url`, `http.status_code`)
- [x] Align error recording with OTel exception convention — `exception` span event with
      `exception.type` and `exception.message` (was span attributes `error.type`, `error.message`)
- [x] Rename vitals attribute `metric.value` → `web_vital.value`

### Advanced sampling
- [x] Error-aware sampler — `sampling.errorAware: true` buffers all spans per session;
      if any span has `status=ERROR`, flushes 100% on page unload regardless of rate;
      otherwise applies `sampling.rate` at session end. 12 unit tests in `processor.test.ts`.

### Advanced privacy engine
- [x] Label-aware PII detection — `isLabelSensitive()` checks `<label for>`, wrapping
      `<label>`, and `aria-label` against sensitive keyword patterns; clicks on matching
      inputs are silently dropped. 9 unit tests in `scrubber.test.ts`.
- [x] Structural selector scrubbing — `scrubDynamicSegments()` strips UUIDs, Styled
      Components hashes (`sc-Xxxx`), Emotion hashes (`css-Xxxx`), long lowercase hex
      strings, and long numeric IDs from auto-derived labels. Applied in `getElementLabel`
      and form name resolution. 10 unit tests in `scrubber.test.ts`.
- [ ] Entropy scoring — strings above a configurable entropy threshold (likely tokens or
      hashes) are redacted automatically, without needing an explicit RegExp

### Behavioral signals (bot / abuse detection layer)

These span attributes extend Blindspot's coverage from "what happened" to "does this session look human." They compose with Scent's risk engine and Shield's tamper signals — the same session that fails Shield's DevTools check and has an abnormally fast interaction velocity is a much stronger abuse signal.

- [x] `ux.session.time_to_first_interaction_ms` — milliseconds from `performance.timeOrigin` to first click, keydown, or touch. Bots acting on page load produce values < 100ms; human median is 1–5 s. Recorded once per route span on first interaction.
- [x] `ux.input.paste_ratio` — fraction of form-field characters that arrived via `paste` event vs typed keystroke, across the whole session. Account creation farms typically paste credentials; legitimate signups type them. Range 0–1; omitted if no input interaction occurred.
- [x] `ux.interaction.mouse_entropy` — velocity variance score (0–1) derived from sampled mouse movement deltas during the session. Scripted mouse movement has near-zero variance; human movement has biological tremor and Fitts's Law deceleration. Omitted on touch-primary devices.
- [x] `ux.session.interaction_rate_60s` — interaction count in the first 60 seconds of the session. Used to detect unnaturally high-speed account creation flows and click farms.

### Testing & compatibility
- [x] E2E test suite (Playwright) against the example apps — smoke-tests golden paths
      for React, Vue, and Next.js App Router integrations (`e2e/` package; covers
      navigation, interaction, fetch + traceparent injection, and error spans for all
      three examples; 18 tests, ~31 s). Also fixed `BlindspotProvider` in both
      `@tindalabs/blindspot-react` and `@tindalabs/blindspot-next` to use `useLayoutEffect` so the SDK is
      initialized before child `useEffect` callbacks fire.
- [x] Browser compatibility matrix (Chrome, Firefox, Safari, Edge) — `COMPATIBILITY.md`
      documents minimum supported versions; Playwright suite covers Chrome (React/Vue/Next),
      Firefox (React), and WebKit/Safari (React, macOS CI only; see `COMPATIBILITY.md`)
- [ ] Performance budget — measure and document SDK overhead (CPU, memory, network)
      using Lighthouse CI or similar; fail CI if budget is exceeded
- [ ] Security audit of privacy engine — confirm no data leakage paths under adversarial
      DOM conditions (mutation observers, shadow DOM, iframes)

---

## Phase 9 — Svelte / SvelteKit Integration (`@tindalabs/blindspot-svelte`)

- [x] `initBlindspot(config)` — SSR-safe init; disables built-in routing so SvelteKit
      navigation hooks take over
- [x] `installBlindspotRouter({ beforeNavigate, afterNavigate })` — accepts SvelteKit's
      navigation hooks as dependencies; no virtual module import inside the library
- [x] `useBlindspot()` composable — `{ addEvent, setAttribute, startSpan }`
- [x] 16 unit tests across init, router, and composables suites
- [x] Framework guide added to docs site (`/framework/svelte`)

---

## Phase 10 — Angular Integration (`@tindalabs/blindspot-angular`)

- [ ] `BlindspotModule` — Angular module that calls `init()` on `APP_INITIALIZER`
- [ ] Router integration via `Router.events` — listen for `NavigationStart` /
      `NavigationEnd`, create root spans, handle `NavigationCancel` / `NavigationError`
- [ ] `BlindspotService` — injectable service exposing `{ addEvent, setAttribute, startSpan }`
- [ ] SSR safety (`isPlatformBrowser` guard — Angular Universal / SSR)
- [ ] Unit tests (Angular Testing Module)
- [ ] Example app (`examples/angular-basic/`)
- [ ] Framework guide added to docs site (`/framework/angular`)

---

## Phase 11 — npm Publish & Ecosystem

### Pre-publish checklist
- [ ] Decide on versioning strategy: independent vs. fixed across packages
- [ ] Audit all `package.json` peer dependency ranges
- [ ] Add `LICENSE` file to each package
- [ ] Verify `exports` map works correctly in Node + bundler + CDN environments
- [ ] Run `pnpm audit` — no high/critical CVEs

### Publish
- [ ] Publish `@tindalabs/blindspot-core`, `@tindalabs/blindspot`, `@tindalabs/blindspot-react`, `@tindalabs/blindspot-vue`,
      `@tindalabs/blindspot-next`, `@tindalabs/blindspot-svelte` to npm under `@blindspot` org
- [ ] Set up automated release workflow (GitHub Actions + Changesets)

### Community
- [ ] Open upstream OTel issue / PR proposing `ux.*` semantic conventions for
      browser interaction spans (route, click, form, vitals)
- [ ] Publish Grafana dashboard to grafana.com/dashboards
- [ ] Publish OTel Collector contrib recipe

---

## Advisory Backlog — 2026-05-19

Findings from a full C-level assessment (CTO / CPO / COO / CMO / CFO + competitive research).
Overall score: **5.7/10** — the code and product deserve a 9; the distribution and process scaffolding score a 3.
Full report: `c-level/reports/blindspot-ux_2026-05-19.md`

### Immediate (this week)

- [x] Add `LICENSE` file (MIT) to repo root — blocks every enterprise procurement tool and package auditor
- [x] Add `.github/workflows/ci.yml` — lint + test + build on every PR and push to main
- [ ] Enable branch protection on `main` requiring CI to pass before merge
- [x] Add `.github/dependabot.yml` for npm monthly dependency updates
- [x] Add `SECURITY.md` with maintainer contact and responsible disclosure path
- [x] Add `# DO NOT USE IN PRODUCTION` comment to `infra/otel-collector.yaml` CORS wildcard + link to collector docs

### Next Sprint (1–4 weeks)

- [ ] Cut `0.1.0` release using Changesets; populate `CHANGELOG.md` with initial entries
- [ ] Publish all 6 packages to npm (`blindspot-core`, `blindspot`, `blindspot-react`, `blindspot-vue`, `blindspot-next`, `blindspot-svelte`)
- [ ] Add unit tests for `packages/web/src/instrumentations/fetch.ts`, `vitals.ts`, `errors.ts`, `behavior.ts` — currently untested
- [ ] Publish Grafana dashboard to grafana.com/dashboards (also in Phase 7 / 11 above)
- [ ] Write "Blindspot vs Session Replay" positioning page in docs — reference CIPA/WESCA litigation explicitly
- [ ] Add CONTRIBUTING.md + PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
- [ ] Pin Docker image versions in `docker-compose.yml` (currently on `:latest` for all three services)
- [ ] Add a troubleshooting guide to docs: "Spans not appearing? Check these 5 things"

### Strategic (1–3 months)

- [ ] Angular integration (`@tindalabs/blindspot-angular`) — Phase 10; closes 20%+ of enterprise frontend market
- [ ] "Show HN" + r/webdev launch post timed to npm publish — primary community seeding event
- [ ] Write 3 targeted blog posts: "Frontend OTel in 5 min", "Why we don't do session replay (and why that matters in 2026)", "Bot detection with OTel behavioral spans"
- [ ] Feature behavioral signals (`ux.input.paste_ratio`, `ux.interaction.mouse_entropy`, `ux.session.time_to_first_interaction_ms`) prominently on README and docs homepage — currently buried in Phase 8
- [ ] Reduce bus factor: solicit co-maintainers; write architecture decision log (ADRs)
- [ ] Define Tindalabs monetization model before community reaches critical mass — OSS SDK + paid Tindalabs Cloud is the most natural path
- [ ] Open upstream OTel SIG proposal for `ux.*` semantic conventions — turns Blindspot's namespace into the standard (also in Phase 11 Community section above)
- [ ] Consider CNCF sandbox application once npm packages reach meaningful download volume

### Watch List

- **OTel Browser SIG velocity** — `opentelemetry-browser` repo launched 2025; if upstream ships first-class browser instrumentation, the auto-instrumentation layer becomes commodity. Deepen behavioral signals and privacy engine (non-commodifiable layers) proactively.
- **Session replay competitor privacy modes** — if Datadog, Sentry, or OpenReplay ships architectural no-PII mode, primary differentiator narrows. Monitor their changelogs.
- **Maintainer sustainability** — if release cadence falls below one release per quarter, initiate co-maintainer search or CNCF sandbox discussion.
